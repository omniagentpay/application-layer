# MCP Payment Server

Production-ready FastAPI project for Model Context Protocol (MCP) Server.

## Tech Stack
- Python 3.11
- FastAPI
- Pydantic v2
- Structlog
- OmniAgentPay SDK

## Project Structure
- `app/main.py`: Entrypoint with lifespan and hardened middleware.
- `app/core`: Configuration (`pydantic-settings`), logging (`structlog`), and security.
- `app/mcp`: 
  - `router.py`: FastAPI `APIRouter` for JSON-RPC 2.0.
  - `registry.py`: Abstract `BaseTool` and dynamic registration.
  - `tools.py`: Concrete tool implementations (`pay`, `check_balance`, etc.).
- `app/payments`: Business logic, composite `PaymentGuard` system, and `PaymentProvider` adapters.
- `app/webhooks`: Webhook handlers for Circle payment events.

## Getting Started
1. **Environment:** Create `.env` from the provided example.
2. **Setup:**
   ```bash
   python3.11 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
3. **Run:**
   ```bash
   uvicorn app.main:app --reload
   ```

## MCP API Reference
All tool calls use a single `APIRouter` endpoint:
- **Endpoint:** `POST /api/v1/mcp/rpc`
- **Method:** JSON-RPC 2.0 compatible.

Example:
```json
{
  "jsonrpc": "2.0",
  "method": "list_tools",
  "id": 1
}
```
