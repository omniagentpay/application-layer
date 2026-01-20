from typing import Any, Dict
from fastapi import APIRouter, HTTPException
import structlog

from app.mcp.schemas import MCPRequest, MCPResponse
from app.mcp.registry import registry
from app.utils.exceptions import PaymentError, GuardValidationError

router = APIRouter()
logger = structlog.get_logger(__name__)

# MCP Error Codes
INVALID_PARAMS = -32602
INTERNAL_ERROR = -32603
METHOD_NOT_FOUND = -32601

@router.post("/rpc", response_model=MCPResponse)
async def mcp_rpc_endpoint(request: MCPRequest):
    """
    Main MCP RPC entry point.
    Maps tool names to execution methods and normalizes errors.
    """
    logger.info("mcp_rpc_call", method=request.method, request_id=request.id)
    
    try:
        if request.method == "list_tools":
            result = [t.model_dump() for t in registry.get_definitions()]
            return MCPResponse(result=result, id=request.id)

        # 1. Execute tool via registry
        # The registry handles tool lookup and execution
        result = await registry.call(request.method, request.params or {})
        
        return MCPResponse(result=result, id=request.id)

    except ValueError as e:
        # Usually "Tool not found" from registry.call
        logger.warn("mcp_method_not_found", method=request.method, error=str(e))
        return MCPResponse(
            error={"code": METHOD_NOT_FOUND, "message": str(e)},
            id=request.id
        )

    except GuardValidationError as e:
        # Specialized handling for payment guardrail violations
        logger.warn("mcp_guard_violation", method=request.method, error=e.detail)
        return MCPResponse(
            error={
                "code": INVALID_PARAMS, 
                "message": "Payment blocked by security policy",
                "data": {"detail": e.detail}
            },
            id=request.id
        )

    except PaymentError as e:
        # General payment processing errors
        logger.error("mcp_payment_error", method=request.method, error=e.detail)
        return MCPResponse(
            error={
                "code": INTERNAL_ERROR, 
                "message": "Payment processing failed",
                "data": {"detail": e.detail}
            },
            id=request.id
        )

    except Exception as e:
        # Catch-all for unexpected internal errors
        logger.exception("mcp_internal_error", method=request.method, error=str(e))
        return MCPResponse(
            error={"code": INTERNAL_ERROR, "message": "An unexpected error occurred"},
            id=request.id
        )
