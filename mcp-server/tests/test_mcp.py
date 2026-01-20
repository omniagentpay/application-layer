import pytest
from app.mcp.registry import ToolRegistry, BaseTool
from typing import Any, Dict

class MockTool(BaseTool):
    @property
    def name(self) -> str:
        return "test_tool"
    
    @property
    def description(self) -> str:
        return "A test tool"
    
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {"type": "object", "properties": {"val": {"type": "string"}}}

    async def execute(self, val: str) -> Dict[str, Any]:
        return {"result": val}

@pytest.mark.asyncio
async def test_tool_registry_registration():
    registry = ToolRegistry()
    registry.register(MockTool)
    
    definitions = registry.get_definitions()
    assert len(definitions) == 1
    assert definitions[0].name == "test_tool"

@pytest.mark.asyncio
async def test_tool_registry_call():
    registry = ToolRegistry()
    registry.register(MockTool)
    
    result = await registry.call("test_tool", {"val": "hello"})
    assert result == {"result": "hello"}

@pytest.mark.asyncio
async def test_tool_registry_invalid_tool():
    registry = ToolRegistry()
    with pytest.raises(ValueError, match="Tool unknown not found"):
        await registry.call("unknown", {})

