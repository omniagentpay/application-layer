"""
X402 Gasless Payment Adapter

Implements off-chain signed payment intents with Circle execution.
Provides gasless UX by signing intents on server-side without requiring user wallet interaction.

Security features:
- EIP-712 structured data signature verification
- Intent expiry timestamp validation
- Nonce-based replay attack protection
- Circle API integration for actual fund transfer
"""

import time
import hashlib
from typing import Dict, Any, Optional
import structlog
from eth_account import Account
from eth_account.messages import encode_structured_data
from app.payments.omni_client import OmniAgentPaymentClient
from app.utils.exceptions import PaymentError

logger = structlog.get_logger(__name__)


class X402Adapter:
    """
    X402 adapter for gasless payments using off-chain signed intents.
    
    Flow:
    1. Receive signed intent (intentId, fromAgent, to, amount, expiresAt, nonce, signature)
    2. Verify signature matches expected signer
    3. Validate intent hasn't expired
    4. Check nonce hasn't been used (replay protection)
    5. Execute payment via Circle
    6. Return tx hash, intent hash, explorer URL
    """
    
    def __init__(self, omni_client: OmniAgentPaymentClient, signing_address: Optional[str] = None):
        """
        Initialize X402 adapter.
        
        Args:
            omni_client: Circle payment client for actual execution
            signing_address: Expected signer address (optional, for verification)
        """
        self.client = omni_client
        self.signing_address = signing_address
        
        # Simple in-memory nonce cache for replay protection
        # In production, use Redis or database
        self.nonce_cache: Dict[str, float] = {}
        
        # Clean up old nonces every 1000 operations
        self._cleanup_counter = 0
    
    def _cleanup_old_nonces(self):
        """Remove nonces older than 1 hour to prevent memory bloat."""
        current_time = time.time()
        expired_nonces = [
            nonce for nonce, timestamp in self.nonce_cache.items()
            if current_time - timestamp > 3600  # 1 hour
        ]
        for nonce in expired_nonces:
            del self.nonce_cache[nonce]
        
        if expired_nonces:
            logger.info("cleaned_old_nonces", count=len(expired_nonces))
    
    def _verify_signature(self, intent: Dict[str, Any]) -> bool:
        """
        Verify EIP-712 signature on the intent.
        
        Args:
            intent: Signed intent with signature field
            
        Returns:
            True if signature is valid
            
        Raises:
            PaymentError: If signature is invalid or missing
        """
        signature = intent.get('signature')
        if not signature:
            raise PaymentError("Missing signature in intent")
        
        # Create EIP-712 structured data for the intent
        structured_data = {
            "types": {
                "EIP712Domain": [
                    {"name": "name", "type": "string"},
                    {"name": "version", "type": "string"},
                    {"name": "chainId", "type": "uint256"},
                ],
                "X402Intent": [
                    {"name": "intentId", "type": "string"},
                    {"name": "fromAgent", "type": "string"},
                    {"name": "to", "type": "address"},
                    {"name": "amount", "type": "string"},
                    {"name": "currency", "type": "string"},
                    {"name": "expiresAt", "type": "uint256"},
                    {"name": "nonce", "type": "string"},
                ]
            },
            "primaryType": "X402Intent",
            "domain": {
                "name": "OmniAgentPay",
                "version": "1",
                "chainId": 5042002,  # ARC Testnet
            },
            "message": {
                "intentId": intent.get('intentId'),
                "fromAgent": intent.get('fromAgent'),
                "to": intent.get('to'),
                "amount": str(intent.get('amount')),
                "currency": intent.get('currency', 'USD'),
                "expiresAt": intent.get('expiresAt'),
                "nonce": intent.get('nonce'),
            }
        }
        
        try:
            # Encode the structured data
            encoded_data = encode_structured_data(structured_data)
            
            # Recover signer address from signature
            signer_address = Account.recover_message(encoded_data, signature=signature)
            
            logger.info("signature_verification", 
                       signer=signer_address,
                       expected=self.signing_address)
            
            # If signing address is specified, verify it matches
            if self.signing_address:
                if signer_address.lower() != self.signing_address.lower():
                    raise PaymentError(f"Invalid signer: expected {self.signing_address}, got {signer_address}")
            
            return True
            
        except Exception as e:
            logger.error("signature_verification_failed", error=str(e))
            raise PaymentError(f"Signature verification failed: {str(e)}")
    
    def _validate_expiry(self, intent: Dict[str, Any]):
        """
        Validate intent hasn't expired.
        
        Args:
            intent: Intent with expiresAt timestamp
            
        Raises:
            PaymentError: If intent has expired
        """
        expires_at = intent.get('expiresAt')
        if not expires_at:
            raise PaymentError("Missing expiresAt in intent")
        
        current_time = int(time.time())
        if current_time > expires_at:
            raise PaymentError(f"Intent expired at {expires_at}, current time {current_time}")
        
        logger.info("expiry_validated", expires_at=expires_at, current_time=current_time)
    
    def _check_nonce_replay(self, intent: Dict[str, Any]):
        """
        Check nonce hasn't been used before (replay protection).
        
        Args:
            intent: Intent with nonce field
            
        Raises:
            PaymentError: If nonce has been used before
        """
        nonce = intent.get('nonce')
        if not nonce:
            raise PaymentError("Missing nonce in intent")
        
        if nonce in self.nonce_cache:
            raise PaymentError(f"Nonce {nonce} already used - replay attack prevented")
        
        # Mark nonce as used
        self.nonce_cache[nonce] = time.time()
        
        # Periodic cleanup
        self._cleanup_counter += 1
        if self._cleanup_counter >= 1000:
            self._cleanup_old_nonces()
            self._cleanup_counter = 0
        
        logger.info("nonce_registered", nonce=nonce)
    
    def _compute_intent_hash(self, intent: Dict[str, Any]) -> str:
        """
        Compute deterministic hash of intent for tracking.
        
        Args:
            intent: Payment intent
            
        Returns:
            Hex string hash of intent
        """
        # Create deterministic string representation
        intent_str = f"{intent.get('intentId')}:{intent.get('fromAgent')}:{intent.get('to')}:{intent.get('amount')}:{intent.get('nonce')}"
        return hashlib.sha256(intent_str.encode()).hexdigest()
    
    async def execute_intent(self, signed_intent: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute x402 signed intent.
        
        Full flow:
        1. Verify signature
        2. Validate expiry
        3. Check nonce (prevent replay)
        4. Execute via Circle
        5. Return receipt
        
        Args:
            signed_intent: Off-chain signed payment intent
            
        Returns:
            Execution receipt with tx hash, intent hash, explorer URL
            
        Raises:
            PaymentError: If validation fails or execution errors
        """
        intent_id = signed_intent.get('intentId')
        logger.info("x402_intent_execution_started", intent_id=intent_id)
        
        try:
            # 1. Security validations
            self._verify_signature(signed_intent)
            self._validate_expiry(signed_intent)
            self._check_nonce_replay(signed_intent)
            
            # 2. Extract payment parameters
            from_wallet_id = signed_intent.get('fromAgent')
            to_address = signed_intent.get('to')
            amount = str(signed_intent.get('amount'))
            currency = signed_intent.get('currency', 'USD')
            
            # 3. Execute payment via Circle using existing client
            logger.info("executing_circle_transfer",
                       from_wallet=from_wallet_id,
                       to=to_address,
                       amount=amount)
            
            execution_result = await self.client.execute_payment(
                from_wallet_id=from_wallet_id,
                to_address=to_address,
                amount=amount,
                currency=currency
            )
            
            # 4. Compute intent hash for tracking
            intent_hash = self._compute_intent_hash(signed_intent)
            
            # 5. Build explorer URL (Arc Testnet)
            tx_hash = execution_result.get('transfer_id', '')
            explorer_url = f"https://testnet.arcscan.app/tx/{tx_hash}"
            
            # 6. Return structured receipt
            receipt = {
                "status": "success",
                "intentId": intent_id,
                "intentHash": intent_hash,
                "txHash": tx_hash,
                "explorerUrl": explorer_url,
                "amount": amount,
                "currency": currency,
                "from": from_wallet_id,
                "to": to_address,
                "mode": "x402",
                "message": "X402 gasless payment executed successfully"
            }
            
            logger.info("x402_execution_success",
                       intent_id=intent_id,
                       tx_hash=tx_hash)
            
            return receipt
            
        except Exception as e:
            logger.error("x402_execution_failed",
                        intent_id=intent_id,
                        error=str(e))
            raise PaymentError(f"X402 execution failed: {str(e)}")


# Factory function for dependency injection
async def get_x402_adapter() -> X402Adapter:
    """Get X402 adapter instance with configured client."""
    client = await OmniAgentPaymentClient.get_instance()
    return X402Adapter(client)
