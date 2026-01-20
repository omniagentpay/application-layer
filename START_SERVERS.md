# Starting the OmniAgentPay Servers

OmniAgentPay requires **two servers** to be running:

1. **MCP Server (Python)** - Handles Circle wallet operations
2. **Node.js Backend Server** - Serves REST API endpoints

## Quick Start

### Terminal 1: Start MCP Server (Python)

```bash
cd mcp-server

# Activate virtual environment
.\venv\Scripts\Activate.ps1  # Windows PowerShell
# or
source venv/bin/activate      # Linux/Mac

# Start MCP server
uvicorn app.main:app --reload --port 3333
```

**Expected Output:**
```
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:3333
```

**Verify:** Visit `http://localhost:3333/health` - should return `{"status":"ok"}`

### Terminal 2: Start Node.js Backend Server

```bash
cd omnipay-agent-dashboard/server

# Install dependencies (if not done)
npm install

# Start backend server
npm run dev
```

**Expected Output:**
```
🚀 Backend server running on http://localhost:3001
```

**Verify:** Visit `http://localhost:3001/health` - should return `{"status":"ok","timestamp":"..."}`

### Terminal 3: Start Frontend (if not already running)

```bash
cd omnipay-agent-dashboard

# Start frontend dev server
npm run dev
```

**Expected Output:**
```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

## Port Configuration

| Service | Default Port | Environment Variable |
|---------|-------------|---------------------|
| MCP Server (Python) | 3333 | `PORT` (in MCP server) |
| Node.js Backend | 3001 | `PORT` (in server/.env) |
| Frontend | 5173 | Vite default |

## Troubleshooting

### "Backend server not available" Error

**Problem:** Frontend can't connect to Node.js backend

**Solution:**
1. Make sure Node.js backend is running on port 3001
2. Check `VITE_API_BASE_URL` in `.env` (should be `http://localhost:3001/api`)
3. Verify backend health: `curl http://localhost:3001/health`

### Port Already in Use

**Problem:** Port 3001 or 3333 is already in use

**Solution:**
1. Find the process:
   ```powershell
   # Windows
   netstat -ano | findstr :3001
   ```
2. Kill the process or change the port in:
   - Node.js backend: `server/index.ts` (line 19)
   - MCP server: Change `--port` flag

### MCP Server Can't Connect

**Problem:** Node.js backend can't reach MCP server

**Solution:**
1. Verify MCP server is running on port 3333
2. Check `MCP_SERVER_URL` in `server/.env` (should be `http://localhost:3333`)
3. Check `MCP_API_KEY` matches MCP server config

## Environment Variables

### Node.js Backend (`server/.env`)

```env
PORT=3001
MCP_SERVER_URL=http://localhost:3333
MCP_API_KEY=dev-secret-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Frontend (`.env`)

```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Verification Checklist

- [ ] MCP server running on port 3333
- [ ] Node.js backend running on port 3001
- [ ] Frontend running on port 5173
- [ ] `http://localhost:3333/health` returns `{"status":"ok"}`
- [ ] `http://localhost:3001/health` returns `{"status":"ok","timestamp":"..."}`
- [ ] Frontend can access `/app/wallet-management` without errors
