from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field

class MCPRequest(BaseModel):
    jsonrpc: str = "2.0"
    method: str
    params: Optional[Dict[str, Any]] = None
    id: Union[str, int, None] = None

class MCPResponse(BaseModel):
    jsonrpc: str = "2.0"
    result: Optional[Any] = None
    error: Optional[Dict[str, Any]] = None
    id: Union[str, int, None] = None

class ToolDefinition(BaseModel):
    name: str
    description: str
    input_schema: Dict[str, Any]

