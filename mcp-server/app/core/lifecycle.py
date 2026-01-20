import structlog
from fastapi import FastAPI
from app.core.config import settings
from app.payments.guards import get_default_guards

logger = structlog.get_logger(__name__)

async def startup_event(app: FastAPI):
    """Actions to run on application startup."""
    logger.info("Initializing MCP Server services...", 
                env=settings.ENVIRONMENT,
                project=settings.PROJECT_NAME)
    
    # Validate critical secrets at startup (Fail-fast)
    if settings.ENVIRONMENT == "prod":
        if not settings.CIRCLE_API_KEY:
            logger.error("CIRCLE_API_KEY is missing in production!")
            raise RuntimeError("Missing CIRCLE_API_KEY")
        if not settings.ENTITY_SECRET:
            logger.error("ENTITY_SECRET is missing in production!")
            raise RuntimeError("Missing ENTITY_SECRET")

    # Validate default guards (Fail-fast)
    try:
        guards = get_default_guards()
        if not guards:
            raise RuntimeError("No default guards configured")
        logger.info("Default guards validated", count=len(guards))
    except Exception as e:
        logger.error("guards_initialization_failed", error=str(e))
        raise RuntimeError(f"Failed to initialize payment guards: {e}")
    
    logger.info("Startup validation complete.")

async def shutdown_event(app: FastAPI):
    """Actions to run on application shutdown."""
    logger.info("Cleaning up MCP Server resources...")
    # Add cleanup logic here (e.g., closing DB pools, SDK clients)
    logger.info("Shutdown complete.")
