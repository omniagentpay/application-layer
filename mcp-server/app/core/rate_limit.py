"""
Rate limiting and abuse protection for FastAPI MCP server.
"""

from typing import Optional
from fastapi import Request, HTTPException, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import structlog

logger = structlog.get_logger(__name__)

# Abuse thresholds
ABUSE_THRESHOLD_COUNT = 50  # Block after 50 failed requests
ABUSE_WINDOW_SECONDS = 15 * 60  # 15 minutes

# In-memory store for abuse tracking (in production, use Redis)
_abuse_tracker: dict[str, dict] = {
    "ip": {},
    "user": {},
}

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)


def get_user_id(request: Request) -> Optional[str]:
    """Extract user ID from request headers."""
    return request.headers.get("X-Privy-User-Id") or request.headers.get("X-User-Id")


def get_client_ip(request: Request) -> str:
    """Get client IP address from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)


def track_failed_request(request: Request, reason: str) -> None:
    """Track failed requests for abuse detection."""
    import time
    
    ip = get_client_ip(request)
    user_id = get_user_id(request)
    now = time.time()
    
    # Track by IP
    if ip not in _abuse_tracker["ip"]:
        _abuse_tracker["ip"][ip] = {"count": 0, "first_seen": now, "blocked": False}
    
    ip_entry = _abuse_tracker["ip"][ip]
    
    # Reset count if window has passed
    if now - ip_entry["first_seen"] > ABUSE_WINDOW_SECONDS:
        ip_entry["count"] = 0
        ip_entry["first_seen"] = now
    
    ip_entry["count"] += 1
    
    # Auto-block if threshold exceeded
    if ip_entry["count"] >= ABUSE_THRESHOLD_COUNT and not ip_entry["blocked"]:
        ip_entry["blocked"] = True
        logger.warn("auto_blocked_ip", ip=ip, count=ip_entry["count"])
    
    # Track by user if available
    if user_id:
        if user_id not in _abuse_tracker["user"]:
            _abuse_tracker["user"][user_id] = {"count": 0, "first_seen": now, "blocked": False}
        
        user_entry = _abuse_tracker["user"][user_id]
        
        # Reset count if window has passed
        if now - user_entry["first_seen"] > ABUSE_WINDOW_SECONDS:
            user_entry["count"] = 0
            user_entry["first_seen"] = now
        
        user_entry["count"] += 1
        
        # Auto-block if threshold exceeded
        if user_entry["count"] >= ABUSE_THRESHOLD_COUNT and not user_entry["blocked"]:
            user_entry["blocked"] = True
            logger.warn("auto_blocked_user", user_id=user_id, count=user_entry["count"])
    
    logger.warn(
        "abuse_tracked",
        ip=ip,
        user_id=user_id,
        reason=reason,
        ip_count=ip_entry["count"],
        user_count=_abuse_tracker["user"].get(user_id, {}).get("count", 0) if user_id else 0,
    )


def is_blocked(request: Request) -> tuple[bool, Optional[str]]:
    """Check if IP or user is blocked."""
    ip = get_client_ip(request)
    user_id = get_user_id(request)
    
    # Check IP block
    ip_entry = _abuse_tracker["ip"].get(ip)
    if ip_entry and ip_entry.get("blocked"):
        return True, "IP address is blocked due to abuse"
    
    # Check user block
    if user_id:
        user_entry = _abuse_tracker["user"].get(user_id)
        if user_entry and user_entry.get("blocked"):
            return True, "User account is blocked due to abuse"
    
    return False, None


def block_client(request: Request, duration_seconds: int = 3600) -> None:
    """Block an IP or user."""
    ip = get_client_ip(request)
    user_id = get_user_id(request)
    
    if ip not in _abuse_tracker["ip"]:
        _abuse_tracker["ip"][ip] = {"count": 0, "blocked": False}
    _abuse_tracker["ip"][ip]["blocked"] = True
    
    if user_id:
        if user_id not in _abuse_tracker["user"]:
            _abuse_tracker["user"][user_id] = {"count": 0, "blocked": False}
        _abuse_tracker["user"][user_id]["blocked"] = True
    
    logger.warn("client_blocked", ip=ip, user_id=user_id, duration=duration_seconds)
    
    # Auto-unblock after duration (simplified - in production use Redis with TTL)
    import asyncio
    async def unblock_after_delay():
        await asyncio.sleep(duration_seconds)
        if ip in _abuse_tracker["ip"]:
            _abuse_tracker["ip"][ip]["blocked"] = False
        if user_id and user_id in _abuse_tracker["user"]:
            _abuse_tracker["user"][user_id]["blocked"] = False
    
    asyncio.create_task(unblock_after_delay())


async def abuse_detection_middleware(request: Request, call_next):
    """Middleware to check if client is blocked."""
    blocked, reason = is_blocked(request)
    if blocked:
        logger.warn("request_blocked", ip=get_client_ip(request), user_id=get_user_id(request), reason=reason)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Access denied", "details": reason},
        )
    
    response = await call_next(request)
    
    # Track failed requests (4xx and 5xx status codes)
    if response.status_code >= 400:
        track_failed_request(request, f"http_{response.status_code}")
    
    return response


# Rate limit decorators
def general_limiter():
    """General API rate limiter - 100 requests per 15 minutes."""
    return limiter.limit("100/15minutes")


def strict_limiter():
    """Strict rate limiter for sensitive endpoints - 20 requests per 15 minutes."""
    return limiter.limit("20/15minutes")


def user_limiter():
    """User-based rate limiter - 200 requests per 15 minutes."""
    def key_func(request: Request) -> str:
        user_id = get_user_id(request)
        return user_id or get_client_ip(request)
    
    return limiter.limit("200/15minutes", key_func=key_func)


# Custom exception handler for rate limit exceeded
def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Custom handler for rate limit exceeded."""
    track_failed_request(request, "rate_limit_exceeded")
    logger.warn(
        "rate_limit_exceeded",
        ip=get_client_ip(request),
        user_id=get_user_id(request),
        limit=exc.detail,
    )
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail={
            "error": "Too many requests",
            "details": "Rate limit exceeded. Please try again later.",
            "retry_after": exc.retry_after,
        },
    )
