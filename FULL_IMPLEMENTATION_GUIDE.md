# OmniAgentPay Agent Dashboard - Complete Implementation Guide

> **Complete Implementation Documentation**  
> **Version:** 1.0.0  
> **Last Updated:** January 2026  
> **Purpose:** Complete reference for recreating the OmniAgentPay Agent Dashboard application

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [MCP Server Implementation](#mcp-server-implementation)
5. [Python SDK Implementation](#python-sdk-implementation)
6. [Backend Server Implementation](#backend-server-implementation)
7. [Frontend Implementation](#frontend-implementation)
8. [Database Schema](#database-schema)
9. [API Endpoints](#api-endpoints)
10. [Configuration Files](#configuration-files)
11. [Dependencies](#dependencies)
12. [Setup Instructions](#setup-instructions)
13. [Deployment Guide](#deployment-guide)

---

## Project Overview

**OmniAgentPay** is payment infrastructure for AI agents, enabling autonomous, secure, and auditable USDC payments on blockchain networks. The system provides:

- **Payment Intent System**: Complete lifecycle from creation to execution
- **Guard-Based Security**: Configurable spending limits and restrictions
- **MCP Integration**: Model Context Protocol server for agent tool integration
- **Python SDK**: OmniAgentPay SDK for payment operations
- **Dashboard UI**: React-based dashboard for monitoring and management
- **Supabase Integration**: Persistent storage for payment intents and data

### Key Components

1. **MCP Server** (FastAPI/Python) - Port 3333
2. **Backend Server** (Node.js/Express) - Port 3001
3. **Frontend** (React/Vite) - Port 5173
4. **Python SDK** (omniagentpay) - Payment execution library
5. **Supabase** (PostgreSQL) - Database

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        OmniAgentPay Platform                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────────┐      ┌──────────────────┐     ┌────────────────┐ │
│   │   React Frontend  │◀────▶│  Node.js Backend │◀───▶│   MCP Server   │ │
│   │   (Vite + TS)     │      │   (Express)      │     │   (FastAPI)    │ │
│   │   Port: 5173      │      │   Port: 3001     │     │   Port: 3333  │ │
│   └──────────────────┘      └──────────────────┘     └────────────────┘ │
│            │                         │                       │          │
│            │                         ▼                       ▼          │
│            │                ┌──────────────────┐    ┌────────────────┐  │
│            └───────────────▶│    Supabase      │    │ OmniAgentPay   │  │
│                             │   (PostgreSQL)   │    │     SDK        │  │
│                             └──────────────────┘    └────────────────┘  │
│                                                              │          │
│                                                              ▼          │
│                                                     ┌────────────────┐  │
│                                                     │   Circle API   │  │
│                                                     │ (Programmable  │  │
│                                                     │   Wallets)     │  │
│                                                     └────────────────┘  │
│                                                              │          │
│                                                              ▼          │
│                                                     ┌────────────────┐  │
│                                                     │  ARC Testnet   │  │
│                                                     │  (Blockchain)  │  │
│                                                     └────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User/Agent Request
       ↓
React Frontend (UI/UX)
       ↓
API Client (HTTP)
       ↓
Express Backend (Routes + Business Logic)
       ↓
┌──────┴──────┐
│             │
↓             ↓
Supabase      MCP Client (JSON-RPC 2.0)
(Storage)            ↓
              MCP Server (FastAPI)
                     ↓
              OmniAgentPay SDK
                     ↓
              Circle API
                     ↓
              ARC Testnet (Blockchain)
```

---

## Technology Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **UI Library:** shadcn/ui (Radix UI primitives)
- **Styling:** Tailwind CSS
- **State Management:** React Context + Local State
- **Routing:** React Router v6
- **HTTP Client:** Fetch API
- **Authentication:** Privy (Web3 wallet auth)

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **ORM:** Supabase Client SDK
- **Storage:** In-memory (Map) + Supabase (persistent)

### MCP Server
- **Framework:** FastAPI (Python)
- **Language:** Python 3.10+
- **Protocol:** JSON-RPC 2.0
- **Server:** Uvicorn (ASGI)
- **Logging:** structlog
- **Rate Limiting:** slowapi

### SDK
- **Language:** Python 3.10+
- **Package:** omniagentpay-0.0.1
- **Dependencies:** Circle SDK, httpx, pydantic

### Infrastructure
- **Blockchain:** ARC Testnet
- **Wallet Provider:** Circle Programmable Wallets
- **Currency:** USDC (Stablecoin)
- **Database:** Supabase (PostgreSQL)

---

## MCP Server Implementation

### Project Structure

```
mcp-server/
├── app/
│   ├── main.py                    # FastAPI app entry point
│   ├── core/
│   │   ├── config.py              # Configuration (pydantic-settings)
│   │   ├── logging.py             # Logging setup (structlog)
│   │   ├── rate_limit.py          # Rate limiting middleware
│   │   └── lifecycle.py           # Startup/shutdown events
│   ├── mcp/
│   │   ├── router.py              # JSON-RPC 2.0 router
│   │   ├── registry.py            # Tool registry
│   │   ├── tools.py               # Core MCP tools
│   │   ├── tools_x402.py          # X402 protocol tools
│   │   └── schemas.py             # Pydantic schemas
│   ├── payments/
│   │   ├── omni_client.py         # OmniAgentPay client wrapper
│   │   ├── service.py             # Payment orchestrator
│   │   ├── interfaces.py          # Abstract interfaces
│   │   ├── providers.py           # Payment providers
│   │   └── adapters/
│   │       ├── __init__.py
│   │       ├── x402.py            # X402 adapter
│   │       └── x402.py            # X402 protocol implementation
│   ├── webhooks/
│   │   └── circle.py              # Circle webhook handlers
│   └── utils/
│       └── exceptions.py          # Custom exceptions
├── omniagentpay-0.0.1/            # SDK package
│   └── omniagentpay/
│       ├── __init__.py
│       ├── client.py              # Main SDK client
│       ├── core/
│       │   ├── config.py
│       │   ├── circle_client.py
│       │   ├── exceptions.py
│       │   ├── logging.py
│       │   └── types.py
│       ├── guards/
│       │   ├── base.py
│       │   ├── budget.py
│       │   ├── confirm.py
│       │   ├── manager.py
│       │   ├── rate_limit.py
│       │   ├── recipient.py
│       │   └── single_tx.py
│       ├── intents/
│       │   ├── service.py
│       │   └── __init__.py
│       ├── ledger/
│       │   ├── ledger.py
│       │   └── __init__.py
│       ├── payment/
│       │   ├── batch.py
│       │   ├── router.py
│       │   └── __init__.py
│       ├── protocols/
│       │   ├── base.py
│       │   ├── gateway.py
│       │   ├── transfer.py
│       │   ├── x402.py
│       │   └── __init__.py
│       ├── storage/
│       │   ├── base.py
│       │   ├── memory.py
│       │   ├── redis.py
│       │   └── __init__.py
│       ├── wallet/
│       │   ├── service.py
│       │   └── __init__.py
│       ├── webhooks/
│       │   ├── parser.py
│       │   └── __init__.py
│       └── onboarding.py
├── tests/
│   ├── test_tools.py
│   ├── test_router.py
│   ├── test_payment_client.py
│   └── test_mcp.py
├── scripts/
│   └── setup_agent_wallet.py
├── requirements.txt
└── README.md
```

### Main Application (`app/main.py`)

```python
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

# CORS configuration
is_development = settings.ENVIRONMENT == "dev"
if is_development or settings.BACKEND_CORS_ORIGINS:
    if is_development and not settings.BACKEND_CORS_ORIGINS:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    else:
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
```

### MCP Schemas (`app/mcp/schemas.py`)

```python
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
```

### MCP Router (`app/mcp/router.py`)

```python
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

        # Execute tool via registry
        result = await registry.call(mcp_request.method, mcp_request.params or {})
        
        return MCPResponse(result=result, id=mcp_request.id)

    except ValueError as e:
        logger.warn("mcp_method_not_found", method=mcp_request.method, error=str(e))
        return MCPResponse(
            error={"code": METHOD_NOT_FOUND, "message": str(e)},
            id=mcp_request.id
        )

    except GuardValidationError as e:
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
        logger.exception("mcp_internal_error", method=mcp_request.method, error=str(e))
        return MCPResponse(
            error={"code": INTERNAL_ERROR, "message": "An unexpected error occurred"},
            id=mcp_request.id
        )
```

### MCP Tools (`app/mcp/tools.py`)

The MCP server implements the following tools:

1. **create_agent_wallet** - Create a managed wallet for an AI agent
2. **pay_recipient** - Send payment to a recipient address
3. **simulate_payment** - Simulate payment without executing
4. **create_payment_intent** - Create a payment intent for later confirmation
5. **confirm_payment_intent** - Confirm and execute a payment intent
6. **create_payment_link** - Generate a USDC payment link
7. **check_balance** - Check USDC balance of a Circle wallet
8. **remove_recipient_guard** - Remove recipient whitelist from a wallet
9. **add_recipient_to_whitelist** - Add addresses to recipient whitelist
10. **get_transaction_status** - Get status and blockchain tx hash

Each tool is implemented as a class inheriting from `BaseTool`:

```python
@registry.register
class CreateAgentWalletTool(BaseTool):
    @property
    def name(self) -> str:
        return "create_agent_wallet"

    @property
    def description(self) -> str:
        return "Create a new managed wallet for an AI agent with default guardrails"

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "agent_name": {"type": "string", "description": "The name of the agent for whom the wallet is created"}
            },
            "required": ["agent_name"]
        }

    async def execute(self, agent_name: str) -> Dict[str, Any]:
        logger.info("mcp_tool_call", tool=self.name, agent_name=agent_name)
        client = await OmniAgentPaymentClient.get_instance()
        try:
            result = await client.create_agent_wallet(agent_name)
            return {"status": "success", "wallet": result}
        except Exception as e:
            logger.error("create_wallet_tool_failed", error=str(e))
            return {"status": "error", "message": str(e)}
```

### Configuration (`app/core/config.py`)

```python
from typing import List, Union, Literal
from pydantic import AnyHttpUrl, field_validator, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "MCP Payment Server"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: Literal["dev", "prod"] = "dev"
    
    # Circle SDK & Payments
    CIRCLE_API_KEY: SecretStr | None = None
    ENTITY_SECRET: SecretStr | None = None
    
    # OmniAgentPay Config
    OMNIAGENTPAY_WEBHOOK_SECRET: SecretStr | None = None
    OMNIAGENTPAY_MERCHANT_ID: str | None = None
    
    # Guard Policies
    OMNIAGENTPAY_DAILY_BUDGET: float = 1000.0
    OMNIAGENTPAY_HOURLY_BUDGET: float = 200.0
    OMNIAGENTPAY_TX_LIMIT: float = 500.0
    OMNIAGENTPAY_RATE_LIMIT_PER_MIN: int = 5
    OMNIAGENTPAY_WHITELISTED_RECIPIENTS: List[str] = []

    @field_validator("CIRCLE_API_KEY", "ENTITY_SECRET")
    @classmethod
    def validate_payment_secrets(cls, v: SecretStr | None, info: any) -> SecretStr | None:
        if info.data.get("ENVIRONMENT") == "prod" and not v:
            raise ValueError(f"Missing payment secret: {info.field_name}")
        return v

    # Security
    SECRET_KEY: str = "secret"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8

    # CORS
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []

    model_config = SettingsConfigDict(
        case_sensitive=True, env_file=".env", extra="ignore"
    )

settings = Settings()
```

### Payment Orchestrator (`app/payments/service.py`)

The PaymentOrchestrator handles the complete payment flow:

```python
class PaymentOrchestrator:
    """ Orchestrates the payment flow: Validation -> Simulation -> Execution. """
    
    async def pay(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a guarded payment flow.
        1. Validate Input
        2. Run Simulation (Required)
        3. Execute with Idempotency
        """
        # 1. Validate MCP tool input
        req = PaymentRequest(**request_data)
        
        # 2. Validate wallet ID format - must be Circle wallet ID, not Privy address
        import re
        privy_address_pattern = re.compile(r'^0x[a-fA-F0-9]{40}$')
        if privy_address_pattern.match(req.from_wallet_id):
            raise PaymentError(
                "Autonomous payments require a Circle Wallet. Privy wallets require human interaction."
            )
        
        # 3. Simulation (REQUIRED before execution)
        simulation = await self.client.simulate_payment(
            from_wallet_id=req.from_wallet_id,
            to_address=req.to_address,
            amount=req.amount,
            currency=req.currency,
            destination_chain=req.destination_chain
        )

        if simulation.get("status") != "success" or not simulation.get("validation_passed"):
            raise GuardValidationError(f"Payment simulation failed: {simulation.get('reason', 'Unknown error')}")

        # 4. Execution
        execution_result = await self.client.execute_payment(
            from_wallet_id=req.from_wallet_id,
            to_address=req.to_address,
            amount=req.amount,
            currency=req.currency,
            destination_chain=req.destination_chain
        )

        return {
            "status": "success",
            "payment_id": execution_result.get("transfer_id"),
            "transfer_id": execution_result.get("transfer_id"),
            "transaction_id": execution_result.get("transfer_id"),
            "blockchain_tx": execution_result.get("tx_hash"),
            "tx_hash": execution_result.get("tx_hash"),
            "amount": req.amount
        }
```

### Payment Client Wrapper (`app/payments/omni_client.py`)

The `OmniAgentPaymentClient` wraps the Python SDK:

```python
import asyncio
import structlog
from decimal import Decimal
from typing import Any, Dict, List, Optional
from omniagentpay import OmniAgentPay
from omniagentpay.core.types import Network
from app.core.config import settings
from app.payments.interfaces import AbstractPaymentClient

logger = structlog.get_logger(__name__)

class OmniAgentPaymentClient(AbstractPaymentClient):
    """
    Production-ready wrapper for the OmniAgentPay SDK.
    Ensures singleton access and enforces security guardrails.
    """
    
    _instance: Optional["OmniAgentPaymentClient"] = None
    _lock = asyncio.Lock()

    def __init__(self):
        network = Network.ARC_TESTNET if settings.ENVIRONMENT == "dev" else Network.ETH
        
        entity_secret = None
        if settings.ENTITY_SECRET:
            try:
                entity_secret_str = settings.ENTITY_SECRET.get_secret_value()
                if len(entity_secret_str) == 64:
                    try:
                        int(entity_secret_str, 16)  # Validate hex
                        entity_secret = entity_secret_str
                    except ValueError:
                        logger.warning("Invalid ENTITY_SECRET format (not hex), will auto-generate")
                        entity_secret = None
                else:
                    logger.warning(f"Invalid ENTITY_SECRET length ({len(entity_secret_str)}), expected 64, will auto-generate")
                    entity_secret = None
            except Exception as e:
                logger.warning(f"Error reading ENTITY_SECRET: {e}, will auto-generate")
                entity_secret = None
        
        self._client = OmniAgentPay(
            circle_api_key=settings.CIRCLE_API_KEY.get_secret_value() if settings.CIRCLE_API_KEY else "",
            entity_secret=entity_secret,
            network=network
        )
        logger.info("OmniAgentPay SDK initialized")

    @classmethod
    async def get_instance(cls) -> "OmniAgentPaymentClient":
        if cls._instance is None:
            async with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    async def create_agent_wallet(self, agent_name: str) -> Dict[str, Any]:
        """Creates a wallet and automatically applies all configured guard policies."""
        logger.info("creating_guarded_wallet", agent=agent_name)
        
        wallet = await self._client.create_wallet(name=agent_name)
        wallet_id = wallet.id

        # Attach security guards using SDK methods
        await self._client.add_budget_guard(
            wallet_id=wallet_id,
            daily_limit=settings.OMNIAGENTPAY_DAILY_BUDGET,
            hourly_limit=settings.OMNIAGENTPAY_HOURLY_BUDGET
        )
        await self._client.add_rate_limit_guard(
            wallet_id=wallet_id,
            max_per_minute=settings.OMNIAGENTPAY_RATE_LIMIT_PER_MIN
        )
        await self._client.add_single_tx_guard(
            wallet_id=wallet_id,
            max_amount=settings.OMNIAGENTPAY_TX_LIMIT
        )
        if settings.OMNIAGENTPAY_WHITELISTED_RECIPIENTS:
            await self._client.add_recipient_guard(
                wallet_id=wallet_id,
                addresses=settings.OMNIAGENTPAY_WHITELISTED_RECIPIENTS
            )

        return {
            "wallet_id": wallet_id,
            "address": wallet.address,
            "blockchain": wallet.blockchain,
            "status": wallet.state
        }
```

### MCP Requirements (`requirements.txt`)

```
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
pydantic[email]>=2.5.3
pydantic-settings>=2.1.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
python-multipart>=0.0.6
structlog>=24.1.0
slowapi>=0.1.9
pytest>=8.0.0
pytest-asyncio>=0.23.5
httpx>=0.26.0
omniagentpay>=0.0.1
```

---

## Python SDK Implementation

### SDK Structure

The Python SDK (`omniagentpay-0.0.1`) is located in `mcp-server/omniagentpay-0.0.1/`:

```
omniagentpay/
├── __init__.py
├── client.py              # Main SDK client
├── core/
│   ├── __init__.py
│   ├── config.py          # Configuration management
│   ├── circle_client.py   # Circle API client
│   ├── exceptions.py      # Custom exceptions
│   ├── logging.py         # Logging setup
│   └── types.py           # Type definitions
├── guards/
│   ├── __init__.py
│   ├── base.py            # Base guard class
│   ├── budget.py          # Budget guard
│   ├── confirm.py         # Confirm guard
│   ├── manager.py         # Guard manager
│   ├── rate_limit.py      # Rate limit guard
│   ├── recipient.py       # Recipient guard
│   └── single_tx.py       # Single transaction guard
├── intents/
│   ├── __init__.py
│   └── service.py         # Payment intent service
├── ledger/
│   ├── __init__.py
│   └── ledger.py          # Ledger implementation
├── payment/
│   ├── __init__.py
│   ├── batch.py           # Batch payment processor
│   └── router.py           # Payment router
├── protocols/
│   ├── __init__.py
│   ├── base.py            # Base protocol adapter
│   ├── gateway.py         # Gateway adapter (cross-chain)
│   ├── transfer.py        # Transfer adapter (direct)
│   └── x402.py            # X402 adapter (HTTP 402)
├── storage/
│   ├── __init__.py
│   ├── base.py            # Storage interface
│   ├── memory.py          # In-memory storage
│   └── redis.py           # Redis storage
├── wallet/
│   ├── __init__.py
│   └── service.py         # Wallet service
├── webhooks/
│   ├── __init__.py
│   └── parser.py          # Webhook parser
└── onboarding.py          # Entity secret auto-setup
```

### Main Client (`client.py`)

The `OmniAgentPay` class is the main entry point:

```python
class OmniAgentPay:
    """
    Main client for OmniAgentPay SDK.
    
    Multi-tenant design: serves multiple agents/wallets with per-wallet guards.
    """
    
    def __init__(
        self,
        circle_api_key: str | None = None,
        entity_secret: str | None = None,
        network: Network = Network.ARC_TESTNET,
        log_level: int | str | None = None,
    ) -> None:
        # Initialize configuration
        # Setup logging
        # Initialize Circle client
        # Initialize wallet service
        # Initialize payment router
        # Register adapters (Transfer, X402, Gateway)
        # Initialize guard manager
        # Initialize payment intent service
        # Initialize batch processor
        # Initialize webhook parser
    
    async def pay(
        self,
        wallet_id: str,
        recipient: str,
        amount: Decimal | str | float,
        destination_chain: Network = None,
        purpose: str = None,
        metadata: dict = None,
        idempotency_key: str = None,
        fee_level: FeeLevel = MEDIUM,
        wait_for_completion: bool = False,
        timeout_seconds: float = 30.0,
        skip_guards: bool = False,
    ) -> PaymentResult:
        """Execute a payment with automatic routing."""
    
    async def simulate(
        self,
        wallet_id: str,
        recipient: str,
        amount: Decimal | str | float,
        destination_chain: Network = None,
        currency: str = "USD",
    ) -> SimulationResult:
        """Simulate a payment without executing."""
    
    async def create_payment_intent(
        self,
        wallet_id: str,
        recipient: str,
        amount: Decimal | str | float,
        purpose: str = None,
        metadata: dict = None,
    ) -> PaymentIntent:
        """Create a payment intent for later confirmation."""
    
    async def confirm_payment_intent(self, intent_id: str) -> PaymentResult:
        """Confirm and execute a payment intent."""
    
    # Guard methods
    async def add_budget_guard(
        self,
        wallet_id: str,
        daily_limit: Decimal | str | float,
        hourly_limit: Decimal | str | float = None,
        total_limit: Decimal | str | float = None,
    ):
        """Add budget guard to a wallet."""
    
    async def add_rate_limit_guard(
        self,
        wallet_id: str,
        max_per_minute: int,
        max_per_hour: int = None,
    ):
        """Add rate limit guard to a wallet."""
    
    async def add_single_tx_guard(
        self,
        wallet_id: str,
        max_amount: Decimal | str | float,
        min_amount: Decimal | str | float = None,
    ):
        """Add single transaction guard to a wallet."""
    
    async def add_recipient_guard(
        self,
        wallet_id: str,
        mode: str = "whitelist",
        addresses: List[str] = None,
        domains: List[str] = None,
        patterns: List[str] = None,
    ):
        """Add recipient guard to a wallet."""
```

### Guard System

Guards enforce security policies atomically:

1. **BudgetGuard** - Enforces spending limits over time windows
2. **RateLimitGuard** - Limits transaction frequency
3. **SingleTxGuard** - Limits individual transaction size
4. **RecipientGuard** - Restricts payment recipients (whitelist/blacklist)
5. **ConfirmGuard** - Implements human-in-the-loop approval

### Payment Protocols

The SDK supports three payment protocols:

1. **Transfer Adapter** - Direct USDC transfers to blockchain addresses
2. **X402 Adapter** - HTTP 402 payment protocol for paywalled APIs
3. **Gateway Adapter** - Cross-chain transfers via Circle CCTP

---

## Backend Server Implementation

### Project Structure

```
server/
├── index.ts                 # Express app entry point
├── lib/
│   ├── mcp-client.ts        # MCP client (JSON-RPC 2.0)
│   ├── sdk-client.ts        # SDK client wrapper
│   ├── guards.ts            # Guard configuration
│   ├── storage.ts           # Storage abstraction
│   ├── agent-wallet.ts      # Agent wallet management
│   ├── agent-payment-flow.ts # Payment flow logic
│   ├── arc-balance.ts       # ARC balance checking
│   ├── arcpay-client.ts     # ARC Pay client
│   ├── dev-auth.ts          # Development auth bypass
│   ├── qr-generator.ts      # QR code generation
│   └── rate-limit.ts        # Rate limiting
├── routes/
│   ├── payments.ts          # Payment intent routes
│   ├── wallets.ts           # Wallet routes
│   ├── guards.ts            # Guard routes
│   ├── mcp.ts               # MCP proxy routes
│   ├── transactions.ts      # Transaction routes
│   ├── crosschain.ts        # Cross-chain routes
│   ├── x402.ts              # X402 routes
│   ├── invoice.ts           # Invoice routes
│   └── receipts.ts          # Receipt routes
├── services/
│   └── arcpayCheckout.ts    # ARC Pay checkout service
├── types/
│   └── index.ts             # TypeScript types
├── package.json
└── tsconfig.json
```

### Main Server (`index.ts`)

```typescript
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(compression());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/payments', require('./routes/payments'));
app.use('/api/wallets', require('./routes/wallets'));
app.use('/api/guards', require('./routes/guards'));
app.use('/api/mcp', require('./routes/mcp'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/crosschain', require('./routes/crosschain'));
app.use('/api/x402', require('./routes/x402'));

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
```

### MCP Client (`lib/mcp-client.ts`)

```typescript
interface JsonRpcResponse {
  jsonrpc: string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
  id: string | number | null;
}

export async function callMcp(
  method: string,
  params: Record<string, any>,
  debugId?: string,
  options?: { maxRetries?: number; timeout?: number }
): Promise<unknown> {
  const mcpServerUrl = process.env.MCP_SERVER_URL || process.env.VITE_MCP_SERVER_URL;
  const mcpApiKey = process.env.MCP_API_KEY || process.env.VITE_MCP_API_KEY || '';
  const maxRetries = options?.maxRetries ?? 3;
  const timeout = options?.timeout ?? 30000;

  if (!mcpServerUrl) {
    throw new Error('MCP server not configured. Please set MCP_SERVER_URL environment variable.');
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const mcpParams = debugId ? { ...params, debug_id: debugId } : params;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${mcpServerUrl}/api/v1/mcp/rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mcpApiKey}`,
          'Connection': 'keep-alive',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params: mcpParams,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`MCP call failed: ${response.status}`);
      }

      const data = await response.json() as JsonRpcResponse;

      if (data.error) {
        throw new Error(data.error.message || 'MCP error');
      }

      const result = data.result as any;
      if (result && typeof result === 'object' && result.status === 'error') {
        throw new Error(`MCP ${method}: ${result.message || result.error}`);
      }

      return data.result;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      await sleep(100 * Math.pow(2, attempt));
    }
  }
}
```

### SDK Client (`lib/sdk-client.ts`)

```typescript
import { callMcp } from './mcp-client.js';

export async function simulatePayment(params: {
  amount: number;
  recipient: string;
  recipientAddress: string;
  walletId: string;
  chain: string;
}): Promise<SimulateResult> {
  const result = await callMcp('simulate_payment', {
    from_wallet_id: params.walletId,
    to_address: params.recipientAddress,
    amount: params.amount.toString(),
    currency: 'USD',
  }) as { status: string; simulation?: any };

  if (result.status === 'success' && result.simulation) {
    const sim = result.simulation;
    return {
      success: sim.validation_passed !== false,
      estimatedFee: parseFloat(sim.estimated_fee || '0.5'),
      route: 'auto' as const,
      guardResults: [],
    };
  }

  return {
    success: false,
    estimatedFee: 0,
    route: 'auto',
    guardResults: [],
  };
}

export async function executePayment(intentId: string, intentData?: {
  walletId: string;
  recipientAddress: string;
  amount: number;
  currency?: string;
}): Promise<ExecuteResult> {
  if (intentData) {
    const result = await callMcp('pay_recipient', {
      from_wallet_id: intentData.walletId,
      to_address: intentData.recipientAddress,
      amount: intentData.amount.toString(),
      currency: intentData.currency || 'USD',
    }) as {
      status: string;
      transfer_id?: string;
      blockchain_tx?: string;
      tx_hash?: string;
    };

    if (result.status === 'success') {
      const txHash = result.tx_hash || result.blockchain_tx;
      const explorerBase = process.env.ARC_EXPLORER_TX_BASE || 'https://testnet.arcscan.app/tx';
      const explorerUrl = txHash ? `${explorerBase}/${txHash}` : undefined;

      return {
        success: true,
        txHash,
        circleTransferId: result.transfer_id,
        explorerUrl,
        status: 'succeeded' as const,
      };
    }
  }

  return {
    success: false,
    status: 'failed' as const,
    error: 'Payment execution failed',
  };
}
```

### Backend Package (`package.json`)

```json
{
  "name": "omnipay-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch index.ts",
    "start": "tsx index.ts",
    "build": "tsc",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.90.1",
    "@types/qrcode": "^1.5.6",
    "arcpaykit": "file:../../gateway/arcpaykit",
    "compression": "^1.7.4",
    "cors": "^2.8.5",
    "dotenv": "^17.2.3",
    "ethers": "^6.16.0",
    "express": "^4.21.2",
    "express-rate-limit": "^8.2.1",
    "express-slow-down": "^3.0.1",
    "qrcode": "^1.5.4"
  },
  "devDependencies": {
    "@types/compression": "^1.7.5",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^22.10.5",
    "tsx": "^4.19.2",
    "typescript": "^5.7.3"
  }
}
```

---

## Frontend Implementation

### Project Structure

```
src/
├── components/              # React components
│   ├── AppLayout.tsx       # Main app layout
│   ├── Sidebar.tsx         # Navigation sidebar
│   ├── DevModeBanner.tsx   # Demo mode indicator
│   ├── PaymentTimeline.tsx # Payment lifecycle timeline
│   ├── ExplainPaymentDrawer.tsx # Payment explainability
│   ├── WhatIfSimulator.tsx # What-if analysis
│   ├── ApprovalModal.tsx   # Payment approval UI
│   ├── BlastRadiusPreview.tsx # Guard impact analysis
│   └── ...                 # Other components
├── pages/
│   ├── app/
│   │   ├── DashboardPage.tsx
│   │   ├── PaymentIntentsPage.tsx
│   │   ├── IntentDetailPage.tsx
│   │   ├── WalletsPage.tsx
│   │   ├── WalletDetailPage.tsx
│   │   ├── GuardStudioPage.tsx
│   │   ├── TransactionsPage.tsx
│   │   ├── AgentChatPage.tsx
│   │   └── ...             # Other pages
│   └── LoginPage.tsx
├── services/
│   ├── payments.ts         # Payment API client
│   ├── wallets.ts          # Wallet API client
│   ├── guards.ts           # Guard API client
│   ├── gemini.ts           # Gemini AI chat service
│   └── ...                 # Other services
├── lib/
│   ├── api-client.ts       # HTTP client wrapper
│   └── ...                 # Other utilities
├── hooks/
│   ├── useDashboard.ts
│   ├── useTransactions.ts
│   └── ...                 # Other hooks
├── contexts/
│   └── AuthContext.tsx     # Authentication context
└── types/
    └── index.ts            # TypeScript types
```

### Frontend Package (`package.json`)

```json
{
  "name": "omnipay-agent-dashboard",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@google/generative-ai": "^0.24.1",
    "@privy-io/react-auth": "^3.11.0",
    "@radix-ui/react-*": "...",
    "@supabase/supabase-js": "^2.90.1",
    "@tanstack/react-query": "^5.90.16",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "tailwindcss": "^3.4.17",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.18",
    "@vitejs/plugin-react-swc": "^3.7.1",
    "typescript": "^5.7.3",
    "vite": "^6.0.5"
  }
}
```

---

## Database Schema

### Supabase Tables

#### payment_intents

```sql
CREATE TABLE payment_intents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'USDC',
    recipient TEXT,
    recipient_address TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending',
    wallet_id TEXT,
    chain TEXT DEFAULT 'arc-testnet',
    steps JSONB DEFAULT '[]',
    guard_results JSONB DEFAULT '[]',
    route TEXT,
    tx_hash TEXT,
    blockchain_tx_hash TEXT,
    circle_transfer_id TEXT,
    circle_transaction_id TEXT,
    explorer_url TEXT,
    executed_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### agent_wallets

```sql
CREATE TABLE agent_wallets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    wallet_id TEXT NOT NULL,
    address TEXT NOT NULL,
    balance NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### users

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT,
    wallet_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### transactions

```sql
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    payment_intent_id TEXT,
    wallet_id TEXT,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'USDC',
    recipient TEXT,
    recipient_address TEXT,
    status TEXT,
    tx_hash TEXT,
    blockchain_tx_hash TEXT,
    explorer_url TEXT,
    chain TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## API Endpoints

### Payment Intents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payments` | List all payment intents |
| GET | `/api/payments/:id` | Get payment intent details |
| POST | `/api/payments` | Create payment intent |
| POST | `/api/payments/:id/simulate` | Simulate payment |
| POST | `/api/payments/:id/approve` | Approve payment |
| POST | `/api/payments/:id/execute` | Execute payment |
| GET | `/api/payments/:id/timeline` | Get payment timeline |
| GET | `/api/payments/:id/explanation` | Get payment explanation |

### Wallets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wallets` | List all wallets |
| GET | `/api/wallets/:id` | Get wallet details |
| POST | `/api/wallets` | Create wallet |
| GET | `/api/wallets/:id/balance` | Get wallet balance |
| GET | `/api/wallets/:id/transactions` | Get wallet transactions |

### Guards

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/guards` | List all guards |
| GET | `/api/guards/:id` | Get guard details |
| PATCH | `/api/guards/:id` | Update guard |
| POST | `/api/guards/simulate` | Simulate guard policy |
| GET | `/api/guards/blast-radius` | Get blast radius |

### MCP

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mcp/rpc` | JSON-RPC 2.0 endpoint |
| GET | `/api/mcp/tools` | List MCP tools |

---

## Configuration Files

### Frontend Environment (`.env`)

```bash
# Privy Authentication
VITE_PRIVY_APP_ID=your_privy_app_id

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Gemini AI (for Agent Chat)
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_GEMINI_MODEL=gemini-2.5-flash

# Backend API
VITE_API_BASE_URL=http://localhost:3001/api

# Agent Wallet
VITE_AGENT_CIRCLE_WALLET_ID=your_agent_wallet_id

# Development
VITE_DEV_AUTH_BYPASS=false
```

### Backend Environment (`server/.env`)

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# MCP Server
MCP_SERVER_URL=http://localhost:3333
MCP_API_KEY=dev-secret-key

# Agent Wallet
AGENT_CIRCLE_WALLET_ID=your_agent_wallet_id

# Blockchain Explorer
ARC_EXPLORER_TX_BASE=https://testnet.arcscan.app/tx/

# Server
PORT=3001

# Development
DEV_AUTH_BYPASS=false
```

### MCP Server Environment (`mcp-server/.env`)

```bash
# Circle API
CIRCLE_API_KEY=your_circle_api_key
ENTITY_SECRET=your_entity_secret  # Auto-generated if missing

# Environment
ENVIRONMENT=dev

# Guard Policies (optional)
OMNIAGENTPAY_DAILY_BUDGET=1000.0
OMNIAGENTPAY_HOURLY_BUDGET=200.0
OMNIAGENTPAY_TX_LIMIT=500.0
OMNIAGENTPAY_RATE_LIMIT_PER_MIN=5
OMNIAGENTPAY_WHITELISTED_RECIPIENTS=

# Server
PORT=3333
```

---

## Dependencies

### MCP Server Dependencies

```
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
pydantic[email]>=2.5.3
pydantic-settings>=2.1.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
python-multipart>=0.0.6
structlog>=24.1.0
slowapi>=0.1.9
pytest>=8.0.0
pytest-asyncio>=0.23.5
httpx>=0.26.0
omniagentpay>=0.0.1
```

### Backend Dependencies

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.90.1",
    "express": "^4.21.2",
    "cors": "^2.8.5",
    "compression": "^1.7.4",
    "dotenv": "^17.2.3",
    "ethers": "^6.16.0",
    "express-rate-limit": "^8.2.1",
    "express-slow-down": "^3.0.1",
    "qrcode": "^1.5.4"
  }
}
```

### Frontend Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "@privy-io/react-auth": "^3.11.0",
    "@google/generative-ai": "^0.24.1",
    "@supabase/supabase-js": "^2.90.1",
    "@tanstack/react-query": "^5.90.16",
    "@radix-ui/react-*": "...",
    "tailwindcss": "^3.4.17",
    "zod": "^3.24.1"
  }
}
```

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL (via Supabase)
- Circle API keys
- Privy App ID
- Gemini API key

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd omnipay-agent-dashboard
```

### Step 2: Install Dependencies

#### Frontend + Backend

```bash
npm install
cd server && npm install && cd ..
```

#### MCP Server

```bash
cd mcp-server
python -m venv venv
source venv/bin/activate  # or venv\Scripts\Activate.ps1 on Windows
pip install -r requirements.txt
pip install -e ./omniagentpay-0.0.1
cd ..
```

### Step 3: Configure Environment

Create `.env` files as described in [Configuration Files](#configuration-files).

### Step 4: Setup Supabase

1. Create a Supabase project
2. Run migrations from `supabase/migrations/`
3. Configure Row Level Security (RLS) policies if needed

### Step 5: Start Servers

#### Terminal 1: MCP Server

```bash
cd mcp-server
source venv/bin/activate  # or venv\Scripts\Activate.ps1 on Windows
uvicorn app.main:app --reload --port 3333
```

#### Terminal 2: Backend

```bash
cd server
npm run dev
```

#### Terminal 3: Frontend

```bash
npm run dev
```

### Step 6: Access Application

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- MCP Server: http://localhost:3333

---

## Deployment Guide

### Production Checklist

- [ ] Set `ENVIRONMENT=prod` in all `.env` files
- [ ] Configure production Circle API keys
- [ ] Set up production Supabase instance
- [ ] Configure CORS origins
- [ ] Enable rate limiting
- [ ] Set up monitoring and logging
- [ ] Configure HTTPS
- [ ] Set up CI/CD pipeline
- [ ] Run security audit
- [ ] Test payment flows end-to-end

### Docker Deployment (Optional)

Create `Dockerfile` for each service:

```dockerfile
# MCP Server Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3333"]
```

```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "start"]
```

```dockerfile
# Frontend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "run", "preview"]
```

---

## Additional Implementation Details

### MCP Tool Registry Pattern

The MCP server uses a decorator-based registry pattern:

```python
# app/mcp/registry.py
class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}

    def register(self, tool_class: Type[BaseTool]):
        tool_instance = tool_class()
        self._tools[tool_instance.name] = tool_instance
        return tool_class

registry = ToolRegistry()

# Usage in tools.py
@registry.register
class CreateAgentWalletTool(BaseTool):
    @property
    def name(self) -> str:
        return "create_agent_wallet"
    
    async def execute(self, agent_name: str) -> Dict[str, Any]:
        # Implementation
        pass
```

### Error Handling Pattern

The MCP server uses structured error handling:

```python
# app/utils/exceptions.py
class PaymentError(Exception):
    def __init__(self, detail: str):
        self.detail = detail
        super().__init__(detail)

class GuardValidationError(PaymentError):
    pass
```

### Rate Limiting Implementation

```python
# app/core/rate_limit.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)

@router.post("/rpc")
@limiter.limit("20/15minutes")
async def mcp_rpc_endpoint(request: Request, mcp_request: MCPRequest):
    # Implementation
    pass
```

### Logging Pattern

Structured logging with correlation IDs:

```python
import structlog

logger = structlog.get_logger(__name__)

# In middleware
correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
structlog.contextvars.bind_contextvars(correlation_id=correlation_id)

# In handlers
logger.info("mcp_rpc_call", method=mcp_request.method, request_id=mcp_request.id)
```

### Backend Payment Route Pattern

```typescript
// server/routes/payments.ts
paymentsRouter.post('/:id/execute', async (req, res) => {
  try {
    const intentId = req.params.id;
    const intent = storage.getPaymentIntent(intentId);
    
    // Execute payment via MCP
    const result = await executePayment(intentId, {
      walletId: intent.walletId,
      recipientAddress: intent.recipientAddress,
      amount: intent.amount,
      currency: intent.currency,
    });
    
    // Update intent status
    intent.status = result.success ? 'executed' : 'failed';
    intent.txHash = result.txHash;
    storage.updatePaymentIntent(intent);
    
    res.json(intent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Frontend API Client Pattern

```typescript
// src/lib/api-client.ts
const apiClient = {
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${VITE_API_BASE_URL}${endpoint}`, {
      headers: {
        'X-Privy-User-Id': getPrivyUserId(),
      },
    });
    if (!response.ok) throw new Error(response.statusText);
    return response.json();
  },
  
  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${VITE_API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Privy-User-Id': getPrivyUserId(),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(response.statusText);
    return response.json();
  },
};
```

### SDK Payment Flow

```python
# omniagentpay/client.py
async def pay(self, wallet_id: str, recipient: str, amount: Decimal, ...) -> PaymentResult:
    # 1. Validate inputs
    # 2. Check guards (atomic)
    # 3. Route payment (Transfer/X402/Gateway)
    # 4. Execute via Circle API
    # 5. Record in ledger
    # 6. Return result
    pass
```

### Guard Evaluation Flow

```python
# omniagentpay/guards/manager.py
async def check_guards(self, wallet_id: str, context: PaymentContext) -> GuardResult:
    # 1. Get all guards for wallet
    # 2. Check each guard atomically
    # 3. Aggregate results
    # 4. Return pass/fail with reasons
    pass
```

---

## Conclusion

This document provides a complete reference for recreating the OmniAgentPay Agent Dashboard application. All components, configurations, and implementation details are documented above.

For additional information, refer to:
- [README.md](./README.md)
- [MCP_INTEGRATION_STATUS.md](./MCP_INTEGRATION_STATUS.md)
- [docs/COMPREHENSIVE_IMPLEMENTATION_REPORT.md](./docs/COMPREHENSIVE_IMPLEMENTATION_REPORT.md)
- [docs/SDK_DOCUMENTATION.md](./docs/SDK_DOCUMENTATION.md)

---

**Last Updated:** January 2026  
**Version:** 1.0.0
