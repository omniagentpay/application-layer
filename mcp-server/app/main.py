import time
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import structlog

from app.core.config import settings
from app.core.logging import setup_logging
from app.core.lifecycle import startup_event, shutdown_event
from app.core.rate_limit import (
    limiter,
    abuse_detection_middleware,
    general_limiter,
    strict_limiter,
    user_limiter,
    rate_limit_handler,
)
from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded
from app.mcp.router import router as mcp_router
from app.webhooks.circle import router as circle_webhook_router
import app.mcp.tools    # Register payment tools

setup_logging()
logger = structlog.get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await startup_event(app)
    yield
    await shutdown_event(app)

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# Add rate limiting middleware
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)
app.add_middleware(SlowAPIMiddleware)

# Abuse detection middleware (must be early in the chain)
@app.middleware("http")
async def abuse_detection_wrapper(request: Request, call_next):
    return await abuse_detection_middleware(request, call_next)

# Middleware for Correlation ID and Request Logging
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(correlation_id=correlation_id)
    
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    response.headers["X-Correlation-ID"] = correlation_id
    response.headers["X-Process-Time"] = str(process_time)
    
    logger.info(
        "http_request",
        path=request.url.path,
        method=request.method,
        status_code=response.status_code,
        duration=process_time
    )
    return response

# Global Exception Handler for Production Hardening
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    from app.core.rate_limit import track_failed_request
    
    logger.error("unhandled_exception", error=str(exc), path=request.url.path)
    track_failed_request(request, f"exception_{type(exc).__name__}")
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please contact support."},
    )

# CORS configuration - enable in development or if BACKEND_CORS_ORIGINS is set
is_development = settings.ENVIRONMENT == "dev"
if is_development or settings.BACKEND_CORS_ORIGINS:
    # In development, allow all origins; in production, use configured origins
    if is_development and not settings.BACKEND_CORS_ORIGINS:
        # Development mode: allow all origins
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    else:
        # Production mode or explicit origins configured: use configured origins
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

app.include_router(mcp_router, prefix=f"{settings.API_V1_STR}/mcp", tags=["mcp"])
app.include_router(circle_webhook_router, prefix=f"{settings.API_V1_STR}/webhooks", tags=["webhooks"])

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}
