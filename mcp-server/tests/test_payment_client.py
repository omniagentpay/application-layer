import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from decimal import Decimal
from app.payments.omni_client import OmniAgentPaymentClient
from app.core.config import settings


@pytest.fixture
def mock_omni_client():
    """Mock OmniAgentPay SDK client"""
    with patch('app.payments.omni_client.OmniAgentPay') as mock_class:
        mock_instance = MagicMock()
        mock_class.return_value = mock_instance
        yield mock_instance


@pytest.fixture
def payment_client(mock_omni_client):
    """Create OmniAgentPaymentClient instance"""
    client = OmniAgentPaymentClient()
    client._client = mock_omni_client
    return client


@pytest.mark.asyncio
async def test_create_agent_wallet(payment_client, mock_omni_client):
    """Test wallet creation with guards"""
    mock_wallet = MagicMock()
    mock_wallet.id = "wallet-123"
    mock_wallet.address = "0x123"
    mock_wallet.blockchain = "ethereum"
    mock_wallet.state = "active"
    
    mock_omni_client.create_wallet = AsyncMock(return_value=mock_wallet)
    mock_omni_client.add_budget_guard = AsyncMock()
    mock_omni_client.add_rate_limit_guard = AsyncMock()
    mock_omni_client.add_single_tx_guard = AsyncMock()
    
    result = await payment_client.create_agent_wallet("test_agent")
    
    assert result["wallet_id"] == "wallet-123"
    assert result["address"] == "0x123"
    mock_omni_client.create_wallet.assert_called_once()
    mock_omni_client.add_budget_guard.assert_called_once()
    mock_omni_client.add_rate_limit_guard.assert_called_once()
    mock_omni_client.add_single_tx_guard.assert_called_once()


@pytest.mark.asyncio
async def test_create_agent_wallet_no_recipient_guard_when_empty(payment_client, mock_omni_client):
    """Test that recipient guard is not added when whitelist is empty"""
    mock_wallet = MagicMock()
    mock_wallet.id = "wallet-123"
    mock_wallet.address = "0x123"
    mock_wallet.blockchain = "ethereum"
    mock_wallet.state = "active"
    
    mock_omni_client.create_wallet = AsyncMock(return_value=mock_wallet)
    mock_omni_client.add_budget_guard = AsyncMock()
    mock_omni_client.add_rate_limit_guard = AsyncMock()
    mock_omni_client.add_single_tx_guard = AsyncMock()
    mock_omni_client.add_recipient_guard = AsyncMock()
    
    # Temporarily set whitelist to empty
    original_whitelist = settings.OMNIAGENTPAY_WHITELISTED_RECIPIENTS
    settings.OMNIAGENTPAY_WHITELISTED_RECIPIENTS = []
    
    try:
        result = await payment_client.create_agent_wallet("test_agent")
        # Recipient guard should not be called when whitelist is empty
        mock_omni_client.add_recipient_guard.assert_not_called()
    finally:
        settings.OMNIAGENTPAY_WHITELISTED_RECIPIENTS = original_whitelist


@pytest.mark.asyncio
async def test_simulate_payment(payment_client, mock_omni_client):
    """Test payment simulation"""
    mock_result = MagicMock()
    mock_result.would_succeed = True
    mock_result.estimated_fee = Decimal("0.1")
    mock_result.reason = None
    
    mock_omni_client.simulate = AsyncMock(return_value=mock_result)
    
    result = await payment_client.simulate_payment(
        from_wallet_id="wallet-1",
        to_address="0x123",
        amount="10.0",
        currency="USD"
    )
    
    assert result["status"] == "success"
    assert result["validation_passed"] is True
    mock_omni_client.simulate.assert_called_once()


@pytest.mark.asyncio
async def test_create_payment_intent(payment_client, mock_omni_client):
    """Test payment intent creation"""
    # Mock balance check - sufficient balance
    mock_omni_client.get_balance = AsyncMock(return_value=Decimal("100.0"))
    
    mock_intent = MagicMock()
    mock_intent.id = "intent-123"
    mock_intent.status = "requires_confirmation"
    mock_intent.amount = Decimal("10.0")
    
    mock_omni_client.create_payment_intent = AsyncMock(return_value=mock_intent)
    
    result = await payment_client.create_payment_intent(
        wallet_id="wallet-1",
        recipient="0x123",
        amount="10.0",
        currency="USD",
        metadata={"purpose": "test"}
    )
    
    assert result["intent_id"] == "intent-123"
    assert result["status"] == "requires_confirmation"
    mock_omni_client.create_payment_intent.assert_called_once()


@pytest.mark.asyncio
async def test_create_payment_intent_extracts_purpose(payment_client, mock_omni_client):
    """Test that purpose is extracted from metadata"""
    # Mock balance check
    mock_omni_client.get_balance = AsyncMock(return_value=Decimal("100.0"))
    
    mock_intent = MagicMock()
    mock_intent.id = "intent-123"
    mock_intent.status = "requires_confirmation"
    mock_intent.amount = Decimal("10.0")
    
    mock_omni_client.create_payment_intent = AsyncMock(return_value=mock_intent)
    
    await payment_client.create_payment_intent(
        wallet_id="wallet-1",
        recipient="0x123",
        amount="10.0",
        metadata={"purpose": "test_purpose", "other": "data"}
    )
    
    # Check that purpose was extracted and other metadata passed as kwargs
    call_kwargs = mock_omni_client.create_payment_intent.call_args[1]
    assert call_kwargs["purpose"] == "test_purpose"
    assert "other" in call_kwargs
    assert call_kwargs["other"] == "data"
    assert "purpose" not in call_kwargs.get("kwargs", {})


@pytest.mark.asyncio
async def test_create_payment_intent_balance_precheck_insufficient(payment_client, mock_omni_client):
    """Test that balance is checked before creating intent"""
    # Mock balance check to return insufficient balance
    mock_omni_client.get_balance = AsyncMock(return_value=Decimal("5.0"))
    
    with pytest.raises(Exception) as exc_info:
        await payment_client.create_payment_intent(
            wallet_id="wallet-1",
            recipient="0x123",
            amount="10.0"
        )
    
    # Should fail with insufficient balance error before calling create_payment_intent
    assert "insufficient" in str(exc_info.value).lower() or "balance" in str(exc_info.value).lower()
    # Should not have called create_payment_intent
    mock_omni_client.create_payment_intent.assert_not_called()


@pytest.mark.asyncio
async def test_create_payment_intent_balance_precheck_sufficient(payment_client, mock_omni_client):
    """Test that intent is created when balance is sufficient"""
    # Mock balance check to return sufficient balance
    mock_omni_client.get_balance = AsyncMock(return_value=Decimal("100.0"))
    
    mock_intent = MagicMock()
    mock_intent.id = "intent-123"
    mock_intent.status = "requires_confirmation"
    mock_intent.amount = Decimal("10.0")
    
    mock_omni_client.create_payment_intent = AsyncMock(return_value=mock_intent)
    
    result = await payment_client.create_payment_intent(
        wallet_id="wallet-1",
        recipient="0x123",
        amount="10.0"
    )
    
    # Should succeed and create intent
    assert result["intent_id"] == "intent-123"
    mock_omni_client.create_payment_intent.assert_called_once()


@pytest.mark.asyncio
async def test_confirm_intent(payment_client, mock_omni_client):
    """Test payment intent confirmation"""
    mock_result = MagicMock()
    mock_result.status = "succeeded"
    mock_result.success = True
    mock_result.transaction_id = "tx-123"
    mock_result.blockchain_tx = "0xabc"
    mock_result.amount = Decimal("10.0")
    mock_result.recipient = "0x123"
    mock_result.error = None
    
    mock_omni_client.confirm_payment_intent = AsyncMock(return_value=mock_result)
    
    result = await payment_client.confirm_intent("intent-123")
    
    assert result["intent_id"] == "intent-123"
    assert result["status"] == "succeeded"
    assert result["success"] is True
    assert result["transaction_id"] == "tx-123"
    mock_omni_client.confirm_payment_intent.assert_called_once_with(intent_id="intent-123")


@pytest.mark.asyncio
async def test_get_wallet_usdc_balance(payment_client, mock_omni_client):
    """Test getting wallet USDC balance"""
    mock_omni_client.get_balance = AsyncMock(return_value=Decimal("100.0"))
    
    result = await payment_client.get_wallet_usdc_balance("wallet-1")
    
    assert result["wallet_id"] == "wallet-1"
    assert result["usdc_balance"] == "100.0"
    assert result["currency"] == "USDC"
    mock_omni_client.get_balance.assert_called_once_with("wallet-1")


@pytest.mark.asyncio
async def test_get_wallet_usdc_balance_zero(payment_client, mock_omni_client):
    """Test getting wallet balance when wallet has no USDC"""
    # The actual error message format from the SDK
    mock_omni_client.get_balance = AsyncMock(
        side_effect=Exception("Wallet has no USDC balance. The wallet may not have received any USDC yet.")
    )
    
    result = await payment_client.get_wallet_usdc_balance("wallet-1")
    
    assert result["wallet_id"] == "wallet-1"
    assert result["usdc_balance"] == "0"
    assert "note" in result


@pytest.mark.asyncio
async def test_remove_recipient_guard(payment_client, mock_omni_client):
    """Test removing recipient guard"""
    mock_omni_client._guard_manager = MagicMock()
    mock_omni_client._guard_manager.remove_guard = AsyncMock(return_value=True)
    
    result = await payment_client.remove_recipient_guard("wallet-1")
    
    assert result["status"] == "success"
    mock_omni_client._guard_manager.remove_guard.assert_called_once_with("wallet-1", "recipient")


@pytest.mark.asyncio
async def test_add_recipient_to_whitelist(payment_client, mock_omni_client):
    """Test adding recipient to whitelist"""
    mock_omni_client._guard_manager = MagicMock()
    mock_omni_client._guard_manager.remove_guard = AsyncMock(return_value=True)
    mock_omni_client.list_guards = AsyncMock(return_value=["recipient", "budget"])
    mock_omni_client.add_recipient_guard = AsyncMock()
    
    result = await payment_client.add_recipient_to_whitelist("wallet-1", ["0x123", "0x456"])
    
    assert result["status"] == "success"
    assert len(result["whitelisted_addresses"]) == 2
    mock_omni_client.add_recipient_guard.assert_called_once()


@pytest.mark.asyncio
async def test_create_payment_intent_balance_error(payment_client, mock_omni_client):
    """Test error handling for insufficient balance"""
    mock_omni_client.create_payment_intent = AsyncMock(
        side_effect=Exception("Authorization failed: Wallet has no USDC balance")
    )
    mock_intent = MagicMock()
    mock_intent.wallet_id = "wallet-1"
    mock_intent.amount = Decimal("10.0")
    mock_omni_client.get_payment_intent = AsyncMock(return_value=mock_intent)
    mock_omni_client.get_balance = AsyncMock(return_value=Decimal("0"))
    
    with pytest.raises(Exception) as exc_info:
        await payment_client.create_payment_intent(
            wallet_id="wallet-1",
            recipient="0x123",
            amount="10.0"
        )
    
    # Check that the error message contains balance-related information
    error_msg = str(exc_info.value).lower()
    assert "balance" in error_msg or "usdc" in error_msg


@pytest.mark.asyncio
async def test_confirm_intent_balance_error(payment_client, mock_omni_client):
    """Test error handling for insufficient balance during confirmation"""
    mock_omni_client.confirm_payment_intent = AsyncMock(
        side_effect=Exception("Insufficient balance")
    )
    mock_intent = MagicMock()
    mock_intent.wallet_id = "wallet-1"
    mock_intent.amount = Decimal("10.0")
    mock_omni_client.get_payment_intent = AsyncMock(return_value=mock_intent)
    mock_omni_client.get_balance = AsyncMock(return_value=Decimal("0"))
    
    with pytest.raises(Exception) as exc_info:
        await payment_client.confirm_intent("intent-123")
    
    assert "insufficient" in str(exc_info.value).lower() or "balance" in str(exc_info.value).lower()
