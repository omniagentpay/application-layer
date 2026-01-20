import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from decimal import Decimal
from app.mcp.registry import registry
from app.mcp.tools import (
    CreateAgentWalletTool,
    PayRecipientTool,
    SimulatePaymentTool,
    CreatePaymentIntentTool,
    ConfirmPaymentIntentTool,
    CheckBalanceTool,
    RemoveRecipientGuardTool,
    AddRecipientToWhitelistTool
)


@pytest.fixture
def mock_client():
    """Mock OmniAgentPaymentClient instance"""
    with patch('app.mcp.tools.OmniAgentPaymentClient.get_instance') as mock_get:
        mock_instance = AsyncMock()
        mock_get.return_value = mock_instance
        yield mock_instance


@pytest.fixture
def mock_orchestrator():
    """Mock PaymentOrchestrator"""
    with patch('app.mcp.tools.get_payment_orchestrator') as mock_get:
        mock_instance = AsyncMock()
        mock_get.return_value = mock_instance
        yield mock_instance


@pytest.mark.asyncio
async def test_create_agent_wallet_tool_success(mock_client):
    """Test successful wallet creation"""
    mock_client.create_agent_wallet.return_value = {
        "wallet_id": "test-wallet-123",
        "address": "0x123",
        "blockchain": "ethereum",
        "status": "active"
    }
    
    tool = CreateAgentWalletTool()
    result = await tool.execute(agent_name="test_agent")
    
    assert result["status"] == "success"
    assert "wallet" in result
    assert result["wallet"]["wallet_id"] == "test-wallet-123"
    mock_client.create_agent_wallet.assert_called_once_with("test_agent")


@pytest.mark.asyncio
async def test_create_agent_wallet_tool_error(mock_client):
    """Test wallet creation error handling"""
    mock_client.create_agent_wallet.side_effect = Exception("API Error")
    
    tool = CreateAgentWalletTool()
    result = await tool.execute(agent_name="test_agent")
    
    assert result["status"] == "error"
    assert "message" in result


@pytest.mark.asyncio
async def test_pay_recipient_tool_success(mock_orchestrator):
    """Test successful payment"""
    mock_orchestrator.pay.return_value = {
        "status": "success",
        "payment_id": "tx-123",
        "amount": "10.0"
    }
    
    tool = PayRecipientTool()
    result = await tool.execute(
        from_wallet_id="wallet-1",
        to_address="0x123",
        amount="10.0",
        currency="USD"
    )
    
    assert result["status"] == "success"
    assert result["payment_id"] == "tx-123"
    mock_orchestrator.pay.assert_called_once()


@pytest.mark.asyncio
async def test_simulate_payment_tool_success(mock_client):
    """Test payment simulation"""
    mock_client.simulate_payment.return_value = {
        "status": "success",
        "validation_passed": True,
        "estimated_fee": "0.1"
    }
    
    tool = SimulatePaymentTool()
    result = await tool.execute(
        from_wallet_id="wallet-1",
        to_address="0x123",
        amount="10.0",
        currency="USD"
    )
    
    assert result["status"] == "success"
    assert "simulation" in result
    mock_client.simulate_payment.assert_called_once()


@pytest.mark.asyncio
async def test_create_payment_intent_tool_success(mock_client):
    """Test payment intent creation"""
    mock_client.create_payment_intent.return_value = {
        "intent_id": "intent-123",
        "status": "requires_confirmation",
        "amount": "10.0"
    }
    
    tool = CreatePaymentIntentTool()
    result = await tool.execute(
        wallet_id="wallet-1",
        recipient="0x123",
        amount="10.0",
        currency="USD",
        metadata={"purpose": "test"}
    )
    
    assert result["status"] == "success"
    assert "intent" in result
    assert result["intent"]["intent_id"] == "intent-123"
    mock_client.create_payment_intent.assert_called_once()


@pytest.mark.asyncio
async def test_create_payment_intent_without_metadata(mock_client):
    """Test payment intent creation without metadata"""
    mock_client.create_payment_intent.return_value = {
        "intent_id": "intent-123",
        "status": "requires_confirmation",
        "amount": "10.0"
    }
    
    tool = CreatePaymentIntentTool()
    result = await tool.execute(
        wallet_id="wallet-1",
        recipient="0x123",
        amount="10.0"
    )
    
    assert result["status"] == "success"
    mock_client.create_payment_intent.assert_called_once()


@pytest.mark.asyncio
async def test_confirm_payment_intent_tool_success(mock_client):
    """Test payment intent confirmation"""
    mock_client.confirm_intent.return_value = {
        "intent_id": "intent-123",
        "status": "succeeded",
        "success": True,
        "transaction_id": "tx-456"
    }
    
    tool = ConfirmPaymentIntentTool()
    result = await tool.execute(intent_id="intent-123")
    
    assert result["status"] == "success"
    assert "confirmation" in result
    mock_client.confirm_intent.assert_called_once_with("intent-123")


@pytest.mark.asyncio
async def test_check_balance_tool_success(mock_client):
    """Test balance check"""
    mock_client.get_wallet_usdc_balance.return_value = {
        "wallet_id": "wallet-1",
        "usdc_balance": "100.0",
        "currency": "USDC"
    }
    
    tool = CheckBalanceTool()
    result = await tool.execute(wallet_id="wallet-1")
    
    assert result["status"] == "success"
    assert result["usdc_balance"] == "100.0"
    mock_client.get_wallet_usdc_balance.assert_called_once_with("wallet-1")


@pytest.mark.asyncio
async def test_check_balance_tool_zero_balance(mock_client):
    """Test balance check with zero balance"""
    mock_client.get_wallet_usdc_balance.return_value = {
        "wallet_id": "wallet-1",
        "usdc_balance": "0",
        "currency": "USDC",
        "note": "Wallet has no USDC balance"
    }
    
    tool = CheckBalanceTool()
    result = await tool.execute(wallet_id="wallet-1")
    
    assert result["status"] == "success"
    assert result["usdc_balance"] == "0"


@pytest.mark.asyncio
async def test_remove_recipient_guard_tool_success(mock_client):
    """Test removing recipient guard"""
    mock_client.remove_recipient_guard.return_value = {
        "status": "success",
        "message": "Recipient guard removed"
    }
    
    tool = RemoveRecipientGuardTool()
    result = await tool.execute(wallet_id="wallet-1")
    
    assert result["status"] == "success"
    mock_client.remove_recipient_guard.assert_called_once_with("wallet-1")


@pytest.mark.asyncio
async def test_add_recipient_to_whitelist_tool_success(mock_client):
    """Test adding recipient to whitelist"""
    mock_client.add_recipient_to_whitelist.return_value = {
        "status": "success",
        "message": "Recipient guard updated",
        "whitelisted_addresses": ["0x123", "0x456"]
    }
    
    tool = AddRecipientToWhitelistTool()
    result = await tool.execute(
        wallet_id="wallet-1",
        addresses=["0x123", "0x456"]
    )
    
    assert result["status"] == "success"
    assert len(result["whitelisted_addresses"]) == 2
    mock_client.add_recipient_to_whitelist.assert_called_once_with("wallet-1", ["0x123", "0x456"])


@pytest.mark.asyncio
async def test_tool_input_schemas():
    """Test that all tools have valid input schemas"""
    tools = [
        CreateAgentWalletTool(),
        PayRecipientTool(),
        SimulatePaymentTool(),
        CreatePaymentIntentTool(),
        ConfirmPaymentIntentTool(),
        CheckBalanceTool(),
        RemoveRecipientGuardTool(),
        AddRecipientToWhitelistTool()
    ]
    
    for tool in tools:
        schema = tool.input_schema
        assert "type" in schema
        assert schema["type"] == "object"
        assert "properties" in schema
        assert "required" in schema


@pytest.mark.asyncio
async def test_tool_descriptions():
    """Test that all tools have descriptions"""
    tools = [
        CreateAgentWalletTool(),
        PayRecipientTool(),
        SimulatePaymentTool(),
        CreatePaymentIntentTool(),
        ConfirmPaymentIntentTool(),
        CheckBalanceTool(),
        RemoveRecipientGuardTool(),
        AddRecipientToWhitelistTool()
    ]
    
    for tool in tools:
        assert tool.description
        assert len(tool.description) > 0
        assert tool.name
