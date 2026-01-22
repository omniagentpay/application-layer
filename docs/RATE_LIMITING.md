# Rate Limiting & Abuse Protection

This document describes the rate limiting and abuse protection mechanisms implemented in OmniAgentPay.

## Overview

Rate limiting and abuse protection are implemented at multiple layers:

1. **Express Backend (Node.js)** - API-level rate limiting
2. **FastAPI MCP Server (Python)** - MCP endpoint rate limiting
3. **Payment Guards (Python SDK)** - Payment-level rate limiting (existing)

## Express Backend Rate Limiting

### Middleware Stack

The Express backend uses multiple rate limiting strategies:

1. **General Rate Limiter** - 100 requests per 15 minutes per IP
2. **Strict Rate Limiter** - 20 requests per 15 minutes per IP (for sensitive endpoints)
3. **User Rate Limiter** - 200 requests per 15 minutes per authenticated user
4. **Speed Limiter** - Gradual slowdown after 50 requests (adds 100ms delay per request, max 2s)
5. **Abuse Detection** - Tracks failed requests and auto-blocks abusive clients
6. **Request Size Limiter** - Maximum 1MB request body size

### Endpoint Protection

| Endpoint Category | Rate Limits Applied |
|------------------|---------------------|
| `/api/payments`, `/api/intents` | Strict + User |
| `/api/mcp` | Strict |
| `/api/wallets`, `/api/crosschain`, `/api/x402` | Strict + User |
| `/api/transactions`, `/api/guards`, `/api/ledger` | User |
| `/api/workspaces`, `/api/agents`, `/api/invoice` | User |
| `/api/receipts`, `/api/plugins`, `/api/webhooks` | User |
| `/health` | None (excluded) |

### Configuration

Rate limits can be configured via environment variables (future enhancement) or by modifying `server/lib/rate-limit.ts`:

```typescript
// Current defaults
const ABUSE_THRESHOLD_COUNT = 50; // Block after 50 failed requests
const ABUSE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
```

## FastAPI MCP Server Rate Limiting

### Middleware Stack

The FastAPI server uses:

1. **General Rate Limiter** - 100 requests per 15 minutes per IP
2. **Strict Rate Limiter** - 20 requests per 15 minutes per IP (for MCP RPC endpoint)
3. **User Rate Limiter** - 200 requests per 15 minutes per authenticated user
4. **Abuse Detection** - Tracks failed requests and auto-blocks abusive clients

### Endpoint Protection

| Endpoint | Rate Limit |
|----------|-----------|
| `/api/v1/mcp/rpc` | Strict (20/15min) |
| `/api/v1/webhooks/*` | General (100/15min) |
| `/health` | None (excluded) |

### Configuration

Rate limits can be configured in `mcp-server/app/core/rate_limit.py`:

```python
ABUSE_THRESHOLD_COUNT = 50  # Block after 50 failed requests
ABUSE_WINDOW_SECONDS = 15 * 60  # 15 minutes
```

## Abuse Protection

### Automatic Blocking

Both servers automatically block clients (IPs or users) that exceed abuse thresholds:

- **Threshold**: 50 failed requests within 15 minutes
- **Block Duration**: 1 hour (auto-unblock)
- **Tracking**: Failed requests include:
  - Rate limit exceeded (429)
  - Authentication errors (401, 403)
  - Validation errors (400)
  - Server errors (500+)

### Manual Blocking

Administrators can manually block clients using the abuse tracking functions:

**Express Backend:**
```typescript
import { blockClient } from './lib/rate-limit.js';

// Block for 1 hour (default)
blockClient(req);

// Block for custom duration
blockClient(req, 2 * 60 * 60 * 1000); // 2 hours
```

**FastAPI Server:**
```python
from app.core.rate_limit import block_client

# Block for 1 hour (default)
block_client(request)

# Block for custom duration
block_client(request, duration_seconds=7200)  # 2 hours
```

### Checking Block Status

**Express Backend:**
```typescript
import { isBlocked } from './lib/rate-limit.js';

const { blocked, reason } = isBlocked(req);
if (blocked) {
  // Client is blocked
}
```

**FastAPI Server:**
```python
from app.core.rate_limit import is_blocked

blocked, reason = is_blocked(request)
if blocked:
    # Client is blocked
```

## Request Size Limits

### Express Backend

- **JSON Body**: 1MB maximum
- **URL Encoded**: 1MB maximum
- **Middleware**: `requestSizeLimiter(1024 * 1024)`

### FastAPI Server

FastAPI has built-in request size limits. Configure via Uvicorn:

```bash
uvicorn app.main:app --limit-max-requests 1000 --limit-concurrency 100
```

## Rate Limit Headers

Both servers return standard rate limit headers:

- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Remaining requests in window
- `RateLimit-Reset`: Unix timestamp when limit resets

## Error Responses

### Rate Limit Exceeded (429)

```json
{
  "error": "Too many requests",
  "details": "Rate limit exceeded. Please try again later."
}
```

### Blocked Client (403)

```json
{
  "error": "Access denied",
  "details": "IP address is blocked due to abuse"
}
```

### Request Too Large (413)

```json
{
  "error": "Request too large",
  "details": "Request body exceeds maximum size of 1024KB"
}
```

## Production Considerations

### In-Memory Storage

Current implementation uses in-memory storage for abuse tracking. For production:

1. **Use Redis** for distributed rate limiting
2. **Persist block lists** across server restarts
3. **Monitor abuse patterns** and adjust thresholds
4. **Set up alerts** for high abuse rates

### Redis Integration (Future)

```typescript
// Express backend example
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redisClient = new Redis(process.env.REDIS_URL);
const limiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
  }),
  // ... other config
});
```

```python
# FastAPI server example
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware
import redis

redis_client = redis.Redis.from_url(settings.REDIS_URL)
limiter = Limiter(key_func=get_remote_address, storage_uri=settings.REDIS_URL)
```

## Monitoring

### Metrics to Track

1. **Rate Limit Hits** - Number of 429 responses
2. **Abuse Blocks** - Number of auto-blocks
3. **Failed Requests** - Requests with 4xx/5xx status codes
4. **Request Patterns** - Identify suspicious activity

### Logging

Both servers log abuse events:

**Express Backend:**
- Console warnings for auto-blocks
- Failed request tracking

**FastAPI Server:**
- Structured logging via `structlog`
- Logs include IP, user ID, reason, and counts

## Testing

### Testing Rate Limits

```bash
# Test general rate limit (100 requests)
for i in {1..101}; do
  curl http://localhost:3001/api/guards
done

# Test strict rate limit (20 requests)
for i in {1..21}; do
  curl -X POST http://localhost:3001/api/payments \
    -H "Content-Type: application/json" \
    -d '{"amount": 100}'
done
```

### Testing Abuse Detection

```bash
# Trigger failed requests
for i in {1..51}; do
  curl http://localhost:3001/api/invalid-endpoint
done

# Should be blocked after 50 failed requests
curl http://localhost:3001/api/guards
# Returns 403 Forbidden
```

## Configuration Reference

### Environment Variables (Future)

```bash
# Rate limit configuration
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_GENERAL_MAX=100
RATE_LIMIT_STRICT_MAX=20
RATE_LIMIT_USER_MAX=200

# Abuse protection
ABUSE_THRESHOLD_COUNT=50
ABUSE_WINDOW_MS=900000
ABUSE_BLOCK_DURATION_MS=3600000

# Request size
MAX_REQUEST_SIZE_BYTES=1048576  # 1MB
```

## Troubleshooting

### Rate Limits Too Strict

If legitimate users are hitting rate limits:

1. Increase limits in configuration
2. Implement user-based rate limiting (already done)
3. Add whitelist for trusted IPs/users

### False Positives in Abuse Detection

If legitimate requests are being blocked:

1. Review abuse threshold and window
2. Exclude certain error codes from tracking
3. Implement manual unblock mechanism

### Performance Impact

Rate limiting adds minimal overhead:

- **Express**: ~1-2ms per request
- **FastAPI**: ~1-2ms per request
- **Memory**: ~100 bytes per tracked IP/user

For high-traffic scenarios, use Redis-backed storage.
