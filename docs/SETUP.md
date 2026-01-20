# Setup Guide

Complete setup instructions for OmniAgentPay.

## Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 9 or higher (comes with Node.js)
- **Git**: For cloning the repository
- **Code Editor**: VS Code recommended

## Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd omnipay-agent-dashboard
```

### 2. Install Frontend Dependencies

```bash
npm install
```

This installs all frontend dependencies including:
- React and React DOM
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui components
- Other dependencies

### 3. Install Backend Dependencies

```bash
cd server
npm install
cd ..
```

This installs all backend dependencies including:
- Express.js
- TypeScript
- CORS middleware
- Other dependencies

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

**Note**: The backend doesn't require environment variables for basic operation, but you can add them for future SDK/MCP integration.

### Backend Configuration (Optional)

If you need to configure MCP or SDK endpoints, create `server/.env`:

```env
MCP_SERVER_URL=http://localhost:8080
SDK_API_KEY=your-api-key
```

## Development

### Start Backend Server

```bash
cd server
npm run dev
```

The backend server will start on `http://localhost:3001`.

**Expected Output:**
```
🚀 Backend server running on http://localhost:3001
```

### Start Frontend Dev Server

In a new terminal:

```bash
npm run dev
```

The frontend will start on `http://localhost:5173`.

**Expected Output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Access Application

Open your browser and navigate to:
```
http://localhost:5173
```

## Verification

### Check Backend Health

```bash
curl http://localhost:3001/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Check API Endpoints

```bash
# List payment intents
curl http://localhost:3001/api/payments

# List agents
curl http://localhost:3001/api/agents

# List guards
curl http://localhost:3001/api/guards
```

## Troubleshooting

### Port Already in Use

**Error**: `Port 3001 is already in use`

**Solution**: 
1. Find the process using the port:
   ```bash
   # macOS/Linux
   lsof -i :3001
   
   # Windows
   netstat -ano | findstr :3001
   ```
2. Kill the process or change the port in `server/index.ts`

### Frontend Can't Connect to Backend

**Error**: `Failed to fetch` or CORS errors

**Solution**:
1. Verify backend is running on port 3001
2. Check `VITE_API_BASE_URL` in `.env`
3. Verify CORS configuration in `server/index.ts`

### TypeScript Errors

**Error**: Type errors in IDE

**Solution**:
1. Restart TypeScript server in VS Code (Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server")
2. Run `npm run build` to see all errors
3. Check `tsconfig.json` configuration

### Module Not Found

**Error**: `Cannot find module`

**Solution**:
1. Delete `node_modules` and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
2. Check import paths are correct
3. Verify file exists at path

## Production Build

### Build Frontend

```bash
npm run build
```

Output will be in `dist/` directory.

### Build Backend

```bash
cd server
npm run build
```

Output will be in `server/dist/` directory.

### Serve Production Build

#### Frontend (Nginx Example)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /path/to/omnipay-agent-dashboard/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

#### Backend (PM2 Example)

```bash
cd server
pm2 start dist/index.js --name omnipay-api
```

## Development Tools

### VS Code Extensions (Recommended)

- **ESLint**: Code linting
- **Prettier**: Code formatting
- **TypeScript**: Type checking
- **Tailwind CSS IntelliSense**: CSS autocomplete
- **Error Lens**: Inline error display

### Browser Extensions

- **React Developer Tools**: React debugging
- **Redux DevTools**: State debugging (if using Redux)

## Database Setup (Future)

When migrating to a database:

### PostgreSQL

```bash
# Install PostgreSQL
# Create database
createdb omnipay

# Run migrations
npm run migrate
```

### MongoDB

```bash
# Install MongoDB
# Start MongoDB
mongod

# Connection string in .env
MONGODB_URI=mongodb://localhost:27017/omnipay
```

## Docker Setup (Future)

### Docker Compose

```yaml
version: '3.8'
services:
  frontend:
    build: .
    ports:
      - "80:80"
  
  backend:
    build: ./server
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://...
```

### Run with Docker

```bash
docker-compose up
```

## CI/CD Setup (Future)

### GitHub Actions Example

```yaml
name: CI/CD

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run build
      - run: ./deploy.sh
```

## Next Steps

1. **Explore Features**: Check out [FEATURES.md](./FEATURES.md)
2. **Read API Docs**: See [API.md](./API.md)
3. **Understand Architecture**: Review [ARCHITECTURE.md](./ARCHITECTURE.md)
4. **Start Developing**: Follow [USAGE.md](./USAGE.md)

## Getting Help

- **Documentation**: Check `docs/` directory
- **Issues**: Create an issue in the repository
- **Team**: Contact development team

## Common Commands

```bash
# Development
npm run dev              # Start frontend dev server
cd server && npm run dev # Start backend dev server

# Building
npm run build           # Build frontend
cd server && npm run build # Build backend

# Testing
npm test                # Run tests
npm run test:watch     # Watch mode

# Linting
npm run lint            # Run ESLint
```
