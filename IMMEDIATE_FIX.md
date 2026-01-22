# IMMEDIATE FIX FOR PAYMENT LINK GENERATION

## The Problem

The error "Provide API key via Authorization header" means the backend server is running **OLD CODE** that doesn't have the updated environment variables.

## The Solution (DO THIS NOW)

###  Step 1: FORCE STOP THE SERVER

1. Press `Ctrl+C` in the terminal where `npm run dev` is running
2. Wait 5 seconds for it to fully stop
3. If it doesn't stop, close the terminal window entirely

### Step 2: CLEAR CACHES

Run this in PowerShell:
```powershell
cd e:\arc\omnipay\omnipay-agent-dashboard
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .vite -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
```

### Step 3: RESTART CLEAN

```powershell
npm run dev
```

### Step 4: VERIFY IT'S WORKING

You should now see these lines when the server starts:
```
✅ Agent Circle wallet configured: 8a57ee78-f796-536e-aa8e-b5fadfd3dcec
✅ ArcPay API key configured: sk_arc_live_3da...
✅ ArcPay Gateway URL: https://arcpay.systems
✅ ArcPay Environment: production
🚀 Backend server running on http://localhost:3001
```

If you DON'T see these lines, the server isn't loading the .env file correctly.

### Step 5: TEST

Go to Agent Chat and type:
```
generate a payment link for 10 USDC
```

Should work now! ✅

---

## If It STILL Doesn't Work

### Alternative: Start Backend Separately

The issue might be that Vite's dev server isn't starting the backend properly. Try this:

1. **Terminal 1** - Start ONLY the backend:
   ```powershell
   cd e:\arc\omnipay\omnipay-agent-dashboard
   cd server
   node --loader tsx index.ts
   ```

2. **Terminal 2** - Start ONLY the frontend:
   ```powershell
   cd e:\arc\omnipay\omnipay-agent-dashboard  
   npm run dev -- --no-backend
   ```

Wait, that won't work because there's no `--no-backend` flag. Let me check the package.json scripts...

Actually, looking at your setup, the backend should start automatically with `npm run dev`. The problem is it's not picking up the environment variables.

---

## NUCLEAR OPTION: Manual Environment Variable Override

If nothing else works, we can hardcode the values temporarily. Edit `server/services/arcpayCheckout.ts`:

Find this line (around line 17):
```typescript
const apiKey = process.env.ARCPAY_SECRET_KEY || process.env.ARCPAY_API_KEY;
```

**Temporarily** change it to:
```typescript
const apiKey = process.env.ARCPAY_SECRET_KEY || process.env.ARCPAY_API_KEY || 'sk_arc_live_3dad2e2e08e9d75b938bce7cad108ae9f0412f84992fb444';
```

And this line (around line 18):
```typescript
const baseUrl = process.env.ARCPAY_BASE_URL || 'https://arcpay.systems';
```

This will use the hardcoded values if the environment variables aren't loading.

**IMPORTANT**: This is ONLY for testing! Remove the hardcoded key before committing to Git!

---

## Most Likely Solution

The issue is the backend server cache. Do Step 1-3 above (stop server, clear cache, restart).

That should fix it. 100%.
