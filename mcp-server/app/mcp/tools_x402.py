
@registry.register
class ExecuteX402PaymentTool(BaseTool):
    """Execute gasless payment using off-chain signed x402 intent"""
    
    @property
    def name(self) -> str:
        return "execute_x402_payment"

    @property
    def description(self) -> str:
        return "Execute a gasless payment using an off-chain signed x402 intent (no wallet signing required)"

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "intentId": {"type": "string", "description": "Unique intent ID"},
                "fromAgent": {"type": "string", "description": "Source Circle wallet ID"},
                "to": {"type": "string", "description": "Recipient address (0x...)"},
                "amount": {"type": "string", "description": "Amount to send"},
                "currency": {"type": "string", "default": "USD"},
                "expiresAt": {"type": "integer", "description": "Unix timestamp expiry"},
                "nonce": {"type": "string", "description": "Unique nonce for replay protection"},
                "signature": {"type": "string", "description": "EIP-712 signature (0x...)"}
            },
            "required": ["intentId", "fromAgent", "to", "amount", "expiresAt", "nonce", "signature"]
        }

    async def execute(self, **kwargs) -> Dict[str, Any]:
        logger.info("mcp_tool_call", tool=self.name, intent_id=kwargs.get('intentId'))
        try:
            from app.payments.adapters.x402 import get_x402_adapter
            adapter = await get_x402_adapter()
            result = await adapter.execute_intent(kwargs)
            return result
        except Exception as e:
            logger.error("execute_x402_payment_tool_failed", intent_id=kwargs.get('intentId'), error=str(e))
            return {"status": "error", "message": str(e)}
