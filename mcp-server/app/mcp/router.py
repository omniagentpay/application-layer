from typing import Any, Dict
from fastapi import APIRouter, HTTPException, Request
import structlog

from app.mcp.schemas import MCPRequest, MCPResponse
from app.mcp.registry import registry
from app.utils.exceptions import PaymentError, GuardValidationError
from app.core.rate_limit import limiter

router = APIRouter()
logger = structlog.get_logger(__name__)

# MCP Error Codes
INVALID_PARAMS = -32602
INTERNAL_ERROR = -32603
METHOD_NOT_FOUND = -32601

@router.post("/rpc", response_model=MCPResponse)
@limiter.limit("20/15minutes")
async def mcp_rpc_endpoint(request: Request, mcp_request: MCPRequest):
    """
    Main MCP RPC entry point.
    Maps tool names to execution methods and normalizes errors.
    """
    logger.info("mcp_rpc_call", method=mcp_request.method, request_id=mcp_request.id)
    
    try:
        if mcp_request.method == "list_tools":
            result = [t.model_dump() for t in registry.get_definitions()]
            return MCPResponse(result=result, id=mcp_request.id)

        # 1. Execute tool via registry
        # The registry handles tool lookup and execution
        result = await registry.call(mcp_request.method, mcp_request.params or {})
        
        return MCPResponse(result=result, id=mcp_request.id)

    except ValueError as e:
        # Usually "Tool not found" from registry.call
        logger.warn("mcp_method_not_found", method=mcp_request.method, error=str(e))
        return MCPResponse(
            error={"code": METHOD_NOT_FOUND, "message": str(e)},
            id=mcp_request.id
        )

    except GuardValidationError as e:
        # Specialized handling for payment guardrail violations
        logger.warn("mcp_guard_violation", method=mcp_request.method, error=e.detail)
        return MCPResponse(
            error={
                "code": INVALID_PARAMS, 
                "message": "Payment blocked by security policy",
                "data": {"detail": e.detail}
            },
            id=mcp_request.id
        )

    except PaymentError as e:
        # General payment processing errors
        logger.error("mcp_payment_error", method=mcp_request.method, error=e.detail)
        return MCPResponse(
            error={
                "code": INTERNAL_ERROR, 
                "message": "Payment processing failed",
                "data": {"detail": e.detail}
            },
            id=mcp_request.id
        )

    except Exception as e:
        # Catch-all for unexpected internal errors
        logger.exception("mcp_internal_error", method=mcp_request.method, error=str(e))
        return MCPResponse(
            error={"code": INTERNAL_ERROR, "message": "An unexpected error occurred"},
            id=mcp_request.id
        )
