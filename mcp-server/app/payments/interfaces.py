from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

class AbstractPaymentClient(ABC):
    """Abstract interface for Payment operations to ensure SOLID compliance."""

    @abstractmethod
    async def create_agent_wallet(self, agent_name: str) -> Dict[str, Any]:
        """Creates a managed wallet for an AI agent."""
        pass

    @abstractmethod
    async def add_default_guards(self, wallet_id: str) -> Dict[str, Any]:
        """Adds default security guardrails to a wallet."""
        pass

    @abstractmethod
    async def simulate_payment(
        self, 
        from_wallet_id: str, 
        to_address: str, 
        amount: str, 
        currency: str = "USD"
    ) -> Dict[str, Any]:
        """Simulates a payment without moving real funds."""
        pass

    @abstractmethod
    async def execute_payment(
        self, 
        from_wallet_id: str, 
        to_address: str, 
        amount: str, 
        currency: str = "USD"
    ) -> Dict[str, Any]:
        """Executes a real payment transfer."""
        pass

    @abstractmethod
    async def create_payment_intent(
        self, 
        wallet_id: str,
        recipient: str,
        amount: str, 
        currency: str = "USD", 
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Creates a payment intent for authorization."""
        pass

    @abstractmethod
    async def confirm_intent(self, intent_id: str) -> Dict[str, Any]:
        """Confirms and captures a previously created payment intent."""
        pass

    @abstractmethod
    async def get_wallet_usdc_balance(self, wallet_id: str) -> Dict[str, Any]:
        """Gets the actual Circle wallet USDC balance."""
        pass
