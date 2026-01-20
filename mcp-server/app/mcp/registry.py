from abc import ABC, abstractmethod
from typing import Any, Dict, List, Type
import structlog
from app.mcp.schemas import ToolDefinition

logger = structlog.get_logger(__name__)

class BaseTool(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        pass

    @property
    @abstractmethod
    def input_schema(self) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def execute(self, **kwargs) -> Any:
        pass

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}

    def register(self, tool_class: Type[BaseTool]):
        tool_instance = tool_class()
        self._tools[tool_instance.name] = tool_instance
        logger.info("tool_registered", name=tool_instance.name)
        return tool_class

    async def call(self, name: str, params: Dict[str, Any]) -> Any:
        if name not in self._tools:
            raise ValueError(f"Tool {name} not found")
        return await self._tools[name].execute(**params)

    def get_definitions(self) -> List[ToolDefinition]:
        return [
            ToolDefinition(
                name=tool.name,
                description=tool.description,
                input_schema=tool.input_schema
            )
            for tool in self._tools.values()
        ]

registry = ToolRegistry()
