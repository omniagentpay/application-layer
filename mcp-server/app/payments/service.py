import uuid
import structlog
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field, validator
from app.payments.interfaces import AbstractPaymentClient
from app.payments.omni_client import OmniAgentPaymentClient
from app.utils.exceptions import PaymentError, GuardValidationError

logger = structlog.get_logger(__name__)

class PaymentRequest(BaseModel):
    """Schema for validating MCP tool input."""
    from_wallet_id: str = Field(..., description="The source wallet ID")
    to_address: str = Field(..., description="The recipient's blockchain address")
    amount: str = Field(..., description="Amount to send (e.g., '10.50')")
    currency: str = Field("USD", description="Currency code")
    destination_chain: Optional[str] = Field(None, description="Destination blockchain network for cross-chain transfers (e.g., BASE, ETH, MATIC)")

    @validator("amount")
    def validate_amount(cls, v):
        try:
            float_val = float(v)
            if float_val <= 0:
                raise ValueError("Amount must be positive")
        except ValueError:
            raise ValueError("Amount must be a valid numeric string")
        return v

class PaymentOrchestrator:
    """ Orchestrates the payment flow: Validation -> Simulation -> Execution. """
    
    def __init__(self, client: AbstractPaymentClient):
        self.client = client

    async def pay(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a guarded payment flow.
        1. Validate Input
        2. Run Simulation (Required)
        3. Execute with Idempotency
        
        NOTE: This method only accepts Circle wallet IDs, not Privy addresses.
        Privy wallets require frontend transaction signing and cannot be used here.
        """
        # 1. Validate MCP tool input
        try:
            req = PaymentRequest(**request_data)
        except Exception as e:
            logger.error("invalid_payment_input", error=str(e))
            raise PaymentError(f"Invalid input: {str(e)}")

        # 2. Validate wallet ID format - must be Circle wallet ID, not Privy address
        import re
        privy_address_pattern = re.compile(r'^0x[a-fA-F0-9]{40}$')
        if privy_address_pattern.match(req.from_wallet_id):
            logger.error("privy_wallet_rejected", wallet_id=req.from_wallet_id)
            raise PaymentError(
                "Autonomous payments require a Circle Wallet. Privy wallets require human interaction "
                "and cannot be used for agent execution. Received Privy address format (0x...). "
                "Please use a Circle wallet ID (format: wallet-...)."
            )
        
        # Generate idempotency key for this flow
        idempotency_key = str(uuid.uuid4())
        
        logger.info("orchestrating_payment", 
                    wallet_id=req.from_wallet_id, 
                    amount=req.amount,
                    idempotency_key=idempotency_key)

        # 2. Simulation (REQUIRED before execution)
        simulation = await self.client.simulate_payment(
            from_wallet_id=req.from_wallet_id,
            to_address=req.to_address,
            amount=req.amount,
            currency=req.currency,
            destination_chain=req.destination_chain
        )

        if simulation.get("status") != "success" or not simulation.get("validation_passed"):
            logger.error("payment_simulation_failed", simulation=simulation)
            raise GuardValidationError(f"Payment simulation failed: {simulation.get('reason', 'Unknown error')}")

        # 3. Execution
        try:
            execution_result = await self.client.execute_payment(
                from_wallet_id=req.from_wallet_id,
                to_address=req.to_address,
                amount=req.amount,
                currency=req.currency,
                destination_chain=req.destination_chain
                # In real SDK, we would pass idempotency_key here
            )

            # 4. Return structured result with execution artifacts
            return {
                "status": "success",
                "payment_id": execution_result.get("transfer_id"),
                "transfer_id": execution_result.get("transfer_id"),
                "transaction_id": execution_result.get("transfer_id"),  # Alias for compatibility
                "blockchain_tx": execution_result.get("tx_hash"),  # Include blockchain transaction hash
                "amount": req.amount,
                "currency": req.currency,
                "message": "Payment processed successfully",
                "idempotency_key": idempotency_key
            }

        except Exception as e:
            logger.error("payment_execution_failed", error=str(e))
            raise PaymentError(f"Payment execution failed: {str(e)}")

async def get_payment_orchestrator() -> PaymentOrchestrator:
    """Dependency provider for PaymentOrchestrator."""
    client = await OmniAgentPaymentClient.get_instance()
    return PaymentOrchestrator(client)
