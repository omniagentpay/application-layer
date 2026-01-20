import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def mock_registry():
    """Mock tool registry"""
    with patch('app.mcp.router.registry') as mock_reg:
        yield mock_reg


def test_list_tools(client, mock_registry):
    """Test listing available tools"""
    mock_tool_def = MagicMock()
    mock_tool_def.model_dump.return_value = {
        "name": "test_tool",
        "description": "A test tool",
        "input_schema": {}
    }
    mock_registry.get_definitions.return_value = [mock_tool_def]
    
    response = client.post(
        "/api/v1/mcp/rpc",
        json={
            "jsonrpc": "2.0",
            "method": "list_tools",
            "id": "test_1"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["jsonrpc"] == "2.0"
    assert "result" in data
    assert len(data["result"]) == 1


def test_tool_execution_success(client, mock_registry):
    """Test successful tool execution"""
    mock_registry.call = AsyncMock(return_value={"status": "success", "result": "test"})
    
    response = client.post(
        "/api/v1/mcp/rpc",
        json={
            "jsonrpc": "2.0",
            "method": "test_tool",
            "params": {"param1": "value1"},
            "id": "test_1"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["jsonrpc"] == "2.0"
    assert "result" in data
    assert data["result"]["status"] == "success"


def test_tool_not_found(client, mock_registry):
    """Test error handling for unknown tool"""
    mock_registry.call = AsyncMock(side_effect=ValueError("Tool unknown_tool not found"))
    
    response = client.post(
        "/api/v1/mcp/rpc",
        json={
            "jsonrpc": "2.0",
            "method": "unknown_tool",
            "params": {},
            "id": "test_1"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == -32601  # METHOD_NOT_FOUND


def test_health_check(client):
    """Test health check endpoint"""
    response = client.get("/health")
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_invalid_json_rpc(client):
    """Test handling of invalid JSON-RPC request"""
    response = client.post(
        "/api/v1/mcp/rpc",
        json={
            "method": "test_tool",
            # Missing jsonrpc and id
        }
    )
    
    # Should still return 200 with error
    assert response.status_code == 200
