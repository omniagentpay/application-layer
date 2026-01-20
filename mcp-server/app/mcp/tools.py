import uuid
from typing import Any, Dict, List, Optional
import structlog
from app.mcp.registry import registry, BaseTool
from app.payments.service import get_payment_orchestrator
from app.payments.omni_client import OmniAgentPaymentClient

logger = structlog.get_logger(__name__)

@registry.register
class CreateAgentWalletTool(BaseTool):
    @property
    def name(self) -> str:
        return "create_agent_wallet"

    @property
    def description(self) -> str:
        return "Create a new managed wallet for an AI agent with default guardrails"

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "agent_name": {"type": "string", "description": "The name of the agent for whom the wallet is created"}
            },
            "required": ["agent_name"]
        }

    async def execute(self, agent_name: str) -> Dict[str, Any]:
        logger.info("mcp_tool_call", tool=self.name, agent_name=agent_name)
        client = await OmniAgentPaymentClient.get_instance()
        try:
            result = await client.create_agent_wallet(agent_name)
            return {"status": "success", "wallet": result}
        except Exception as e:
            logger.error("create_wallet_tool_failed", error=str(e))
            return {"status": "error", "message": str(e)}

@registry.register
class PayRecipientTool(BaseTool):
    @property
    def name(self) -> str:
        return "pay_recipient"

    @property
    def description(self) -> str:
        return "Send a payment to a recipient address. Requires a prior simulation."

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "from_wallet_id": {"type": "string", "description": "Source wallet ID"},
                "to_address": {"type": "string", "description": "Recipient blockchain address"},
                "amount": {"type": "string", "description": "Amount to send as a numeric string"},
                "currency": {"type": "string", "description": "Currency code (default: USD)", "default": "USD"}
            },
            "required": ["from_wallet_id", "to_address", "amount"]
        }

    async def execute(self, **kwargs) -> Dict[str, Any]:
        logger.info("mcp_tool_call", tool=self.name, **kwargs)
        orchestrator = await get_payment_orchestrator()
        try:
            result = await orchestrator.pay(kwargs)
            return result
        except Exception as e:
            logger.error("pay_recipient_tool_failed", error=str(e))
            return {"status": "error", "message": str(e)}

@registry.register
class SimulatePaymentTool(BaseTool):
    @property
    def name(self) -> str:
        return "simulate_payment"

    @property
    def description(self) -> str:
        return "Simulate a payment to validate guardrails and estimate success without moving funds"

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "from_wallet_id": {"type": "string", "description": "Source wallet ID"},
                "to_address": {"type": "string", "description": "Recipient blockchain address"},
                "amount": {"type": "string", "description": "Amount to simulate"},
                "currency": {"type": "string", "description": "Currency code (default: USD)", "default": "USD"}
            },
            "required": ["from_wallet_id", "to_address", "amount"]
        }

    async def execute(self, from_wallet_id: str, to_address: str, amount: str, currency: str = "USD") -> Dict[str, Any]:
        logger.info("mcp_tool_call", tool=self.name, from_wallet_id=from_wallet_id, amount=amount)
        client = await OmniAgentPaymentClient.get_instance()
        try:
            result = await client.simulate_payment(
                from_wallet_id=from_wallet_id,
                to_address=to_address,
                amount=amount,
                currency=currency
            )
            return {"status": "success", "simulation": result}
        except Exception as e:
            logger.error("simulate_payment_tool_failed", error=str(e))
            return {"status": "error", "message": str(e)}

@registry.register
class CreatePaymentIntentTool(BaseTool):
    @property
    def name(self) -> str:
        return "create_payment_intent"

    @property
    def description(self) -> str:
        return "Create a payment intent for later confirmation"

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "wallet_id": {"type": "string", "description": "Source wallet ID"},
                "recipient": {"type": "string", "description": "Recipient address or identifier"},
                "amount": {"type": "string", "description": "Amount for the intent"},
                "currency": {"type": "string", "description": "Currency code (default: USD)", "default": "USD"},
                "metadata": {"type": "object", "description": "Optional metadata for the intent"}
            },
            "required": ["wallet_id", "recipient", "amount"]
        }

    async def execute(self, wallet_id: str, recipient: str, amount: str, currency: str = "USD", metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        logger.info("mcp_tool_call", tool=self.name, amount=amount)
        client = await OmniAgentPaymentClient.get_instance()
        try:
            result = await client.create_payment_intent(
                wallet_id=wallet_id,
                recipient=recipient,
                amount=amount, 
                currency=currency, 
                metadata=metadata
            )
            return {"status": "success", "intent": result}
        except Exception as e:
            logger.error("create_intent_tool_failed", error=str(e))
            return {"status": "error", "message": str(e)}

@registry.register
class ConfirmPaymentIntentTool(BaseTool):
    @property
    def name(self) -> str:
        return "confirm_payment_intent"

    @property
    def description(self) -> str:
        return "Confirm and capture a previously created payment intent"

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "intent_id": {"type": "string", "description": "The ID of the payment intent to confirm"}
            },
            "required": ["intent_id"]
        }

    async def execute(self, intent_id: str) -> Dict[str, Any]:
        logger.info("mcp_tool_call", tool=self.name, intent_id=intent_id)
        client = await OmniAgentPaymentClient.get_instance()
        try:
            result = await client.confirm_intent(intent_id)
            return {"status": "success", "confirmation": result}
        except Exception as e:
            logger.error("confirm_intent_tool_failed", error=str(e))
            return {"status": "error", "message": str(e)}

@registry.register
class CreatePaymentLinkTool(BaseTool):
    @property
    def name(self) -> str:
        return "create_payment_link"

    @property
    def description(self) -> str:
        return "Generate a USDC payment link on Arc that can be paid by Privy or Circle wallets"

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "amount": {"type": "number", "description": "Amount in USDC"},
                "currency": {"type": "string", "description": "Currency code (default: USDC)", "default": "USDC"},
                "recipient_wallet": {
                    "type": "object",
                    "description": "Recipient wallet information",
                    "properties": {
                        "type": {"type": "string", "enum": ["circle", "privy"], "description": "Wallet type"},
                        "ref": {"type": "string", "description": "Wallet ID (Circle) or address (Privy 0x...)"}
                    },
                    "required": ["type", "ref"]
                },
                "description": {"type": "string", "description": "Payment description"},
                "expires_in": {"type": "number", "description": "Link expiration in seconds (optional)"}
            },
            "required": ["amount", "recipient_wallet"]
        }

    async def execute(self, **kwargs) -> Dict[str, Any]:
        logger.info("mcp_tool_call", tool=self.name, **kwargs)
        try:
            amount = kwargs.get("amount")
            currency = kwargs.get("currency", "USDC")
            recipient_wallet = kwargs.get("recipient_wallet", {})
            description = kwargs.get("description", f"Payment of {amount} {currency}")
            expires_in = kwargs.get("expires_in")
            
            if not amount or not recipient_wallet.get("ref"):
                return {"status": "error", "message": "Missing required fields: amount and recipient_wallet.ref"}
            
            wallet_type = recipient_wallet.get("type", "privy")
            wallet_ref = recipient_wallet.get("ref")
            
            # Calculate expiration if provided
            expires_at = None
            if expires_in:
                import time
                expires_at = int((time.time() + expires_in) * 1000)
            
            # Return payment link data structure
            # The frontend Gemini service will create the intent via Node.js API
            # This tool just validates and structures the request
            return {
                "status": "success",
                "intent": {
                    "amount": amount,
                    "currency": currency,
                    "recipient_wallet": recipient_wallet,
                    "description": description,
                    "payment_link": {
                        "expires_at": expires_at
                    }
                },
                "message": "Payment link data prepared. Frontend will create the intent and generate the URL."
            }
        except Exception as e:
            logger.error("create_payment_link_tool_failed", error=str(e))
            return {"status": "error", "message": str(e)}

@registry.register
class CheckBalanceTool(BaseTool):
    @property
    def name(self) -> str:
        return "check_balance"

    @property
    def description(self) -> str:
        return "Check the current USDC balance of a Circle wallet (the actual balance used for payments)"

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "wallet_id": {"type": "string", "description": "Circle wallet ID to check"}
            },
            "required": ["wallet_id"]
        }

    async def execute(self, wallet_id: str) -> Dict[str, Any]:
        logger.info("mcp_tool_call", tool=self.name, wallet_id=wallet_id)
        client = await OmniAgentPaymentClient.get_instance()
        try:
            result = await client.get_wallet_usdc_balance(wallet_id)
            return {"status": "success", **result}
        except Exception as e:
            logger.error("check_balance_tool_failed", error=str(e))
            return {"status": "error", "message": str(e)}

@registry.register
class RemoveRecipientGuardTool(BaseTool):
    @property
    def name(self) -> str:
        return "remove_recipient_guard"

    @property
    def description(self) -> str:
        return "Remove the recipient whitelist guard from a wallet to allow payments to any address"

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "wallet_id": {"type": "string", "description": "Wallet ID to remove recipient guard from"}
            },
            "required": ["wallet_id"]
        }

    async def execute(self, wallet_id: str) -> Dict[str, Any]:
        logger.info("mcp_tool_call", tool=self.name, wallet_id=wallet_id)
        client = await OmniAgentPaymentClient.get_instance()
        try:
            result = await client.remove_recipient_guard(wallet_id)
            return {"status": "success", **result}
        except Exception as e:
            logger.error("remove_recipient_guard_tool_failed", error=str(e))
            return {"status": "error", "message": str(e)}

@registry.register
class AddRecipientToWhitelistTool(BaseTool):
    @property
    def name(self) -> str:
        return "add_recipient_to_whitelist"

    @property
    def description(self) -> str:
        return "Add recipient addresses to the whitelist for a wallet"

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "wallet_id": {"type": "string", "description": "Wallet ID"},
                "addresses": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of recipient addresses to whitelist"
                }
            },
            "required": ["wallet_id", "addresses"]
        }

    async def execute(self, wallet_id: str, addresses: List[str]) -> Dict[str, Any]:
        logger.info("mcp_tool_call", tool=self.name, wallet_id=wallet_id, addresses=addresses)
        client = await OmniAgentPaymentClient.get_instance()
        try:
            result = await client.add_recipient_to_whitelist(wallet_id, addresses)
            return {"status": "success", **result}
        except Exception as e:
            logger.error("add_recipient_to_whitelist_tool_failed", error=str(e))
            return {"status": "error", "message": str(e)}

@registry.register
class GetTransactionStatusTool(BaseTool):
    @property
    def name(self) -> str:
        return "get_transaction_status"

    @property
    def description(self) -> str:
        return "Get the status and blockchain transaction hash for a Circle transaction or payment intent"

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "transaction_id": {"type": "string", "description": "Circle transaction ID, transfer ID, or payment intent ID"}
            },
            "required": ["transaction_id"]
        }

    async def execute(self, transaction_id: str) -> Dict[str, Any]:
        logger.info("mcp_tool_call", tool=self.name, transaction_id=transaction_id)
        client = await OmniAgentPaymentClient.get_instance()
        try:
            result = await client.get_transaction_status(transaction_id)
            return result
        except Exception as e:
            logger.error("get_transaction_status_tool_failed", error=str(e))
            return {"status": "error", "message": str(e)}
