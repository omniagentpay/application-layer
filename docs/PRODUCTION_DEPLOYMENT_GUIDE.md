# 🚀 Production Deployment Guide for OmniAgentPay

> **A Simple Step-by-Step Guide** — This guide explains how to deploy the OmniAgentPay application to production, as if you're learning for the first time!

---

## 📋 Table of Contents

1. [What Are We Deploying?](#what-are-we-deploying)
2. [Prerequisites (What You Need First)](#prerequisites-what-you-need-first)
3. [Understanding the Application Components](#understanding-the-application-components)
4. [Step-by-Step Deployment Process](#step-by-step-deployment-process)
5. [Environment Variables Setup](#environment-variables-setup)
6. [Deployment Checklist](#deployment-checklist)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Troubleshooting Common Issues](#troubleshooting-common-issues)

---

## 🎯 What Are We Deploying?

OmniAgentPay is a **payment infrastructure for AI agents**. Think of it like this:

- **Frontend** = The website users see and interact with (like a store's display)
- **Backend** = The server that handles requests (like a store's back office)
- **MCP Server** = The payment processing system (like a cash register)
- **Database** = Where all data is stored (like a filing cabinet)

All four parts need to work together for the application to function!

---

## ✅ Prerequisites (What You Need First)

Before deploying, you need accounts and access to these services:

### 1. **Vercel Account** (for Frontend & Backend)
- **What it is**: A platform to host websites and servers
- **Why we need it**: To make your app accessible on the internet
- **Sign up**: https://vercel.com
- **Cost**: Free tier available

### 2. **Supabase Account** (for Database)
- **What it is**: A database service (stores user data, transactions, etc.)
- **Why we need it**: To save and retrieve application data
- **Sign up**: https://supabase.com
- **Cost**: Free tier available

### 3. **Railway/Render Account** (for MCP Server)
- **What it is**: A platform to host Python applications
- **Why we need it**: To run the payment processing server
- **Sign up**: https://railway.app or https://render.com
- **Cost**: Free tier available (Railway) or $7/month (Render)

### 4. **Circle Account** (for Payments)
- **What it is**: Payment infrastructure for USDC transactions
- **Why we need it**: To process actual payments
- **Sign up**: https://circle.com
- **Cost**: Transaction fees apply

### 5. **Google AI Studio** (for Gemini API)
- **What it is**: AI service for natural language processing
- **Why we need it**: For AI-powered features
- **Sign up**: https://ai.google.dev
- **Cost**: Free tier available

### 6. **Privy Account** (for Authentication)
- **What it is**: User authentication service
- **Why we need it**: To let users log in securely
- **Sign up**: https://privy.io
- **Cost**: Free tier available

---

## 🧩 Understanding the Application Components

Let's break down what each part does:

### **Component 1: Frontend (React/Vite App)**
- **Location**: Root directory (`/`)
- **What it does**: The user interface - what people see and click
- **Technology**: React + TypeScript + Vite
- **Deployment**: Vercel
- **Build command**: `npm run build`
- **Output**: `dist/` folder

### **Component 2: Backend (Node.js/Express Server)**
- **Location**: `server/` folder
- **What it does**: Handles API requests, connects frontend to database
- **Technology**: Node.js + Express + TypeScript
- **Deployment**: Vercel (as serverless functions)
- **Build command**: `npm run build`
- **Entry point**: `server/index.ts`

### **Component 3: MCP Server (Python/FastAPI)**
- **Location**: `mcp-server/` folder
- **What it does**: Processes payments, executes transactions
- **Technology**: Python + FastAPI
- **Deployment**: Railway or Render
- **Requirements**: `requirements.txt`
- **Entry point**: `app/main.py`

### **Component 4: Database (Supabase PostgreSQL)**
- **Location**: `supabase/migrations/` folder
- **What it does**: Stores all application data
- **Technology**: PostgreSQL (managed by Supabase)
- **Deployment**: Supabase Cloud
- **Migrations**: SQL files in `supabase/migrations/`

---

## 🔧 Step-by-Step Deployment Process

### **STEP 1: Set Up Supabase Database** ⚡

This is like building the foundation of a house - do this first!

#### 1.1 Create a Supabase Project
1. Go to https://supabase.com
2. Click "New Project"
3. Fill in:
   - **Project Name**: `omniagentpay-production`
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your users
4. Click "Create new project"
5. Wait 2-3 minutes for setup

#### 1.2 Get Your Database Credentials
1. In your Supabase project, go to **Settings** → **API**
2. Copy these values (you'll need them later):
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (long string starting with `eyJ...`)

#### 1.3 Run Database Migrations
1. Install Supabase CLI on your computer:
   ```bash
   npm install -g supabase
   ```

2. Link your local project to Supabase:
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```
   (Find `PROJECT_REF` in your Supabase project URL: `https://[PROJECT_REF].supabase.co`)

3. Push migrations to create database tables:
   ```bash
   npx supabase db push
   ```

4. Verify migrations ran successfully:
   ```bash
   npx supabase migration list
   ```

**✅ Checkpoint**: Your database is now set up with all necessary tables!

---

### **STEP 2: Deploy MCP Server (Python)** 🐍

This is the payment processing engine.

#### Option A: Deploy to Railway (Recommended)

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your repository
   - Select the repository

3. **Configure the Service**
   - Railway will auto-detect it's a Python app
   - Set **Root Directory**: `mcp-server`
   - Set **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

4. **Add Environment Variables**
   Go to your Railway project → Variables tab, add:
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJ...your-key...
   CIRCLE_API_KEY=your-circle-api-key
   CIRCLE_ENTITY_SECRET=your-circle-entity-secret
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (2-3 minutes)
   - Copy your deployment URL (looks like: `https://xxx.railway.app`)

#### Option B: Deploy to Render

1. **Create Render Account**
   - Go to https://render.com
   - Sign up with GitHub

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your repository
   - Configure:
     - **Name**: `omniagentpay-mcp`
     - **Root Directory**: `mcp-server`
     - **Runtime**: Python 3
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

3. **Add Environment Variables** (same as Railway)

4. **Deploy** and copy the URL

**✅ Checkpoint**: Your MCP server is live! Test it by visiting `https://your-mcp-url/health`

---

### **STEP 3: Deploy Backend (Node.js Server)** 🖥️

The backend connects everything together.

#### 3.1 Prepare Backend for Deployment

1. **Navigate to server folder**:
   ```bash
   cd server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the backend**:
   ```bash
   npm run build
   ```

#### 3.2 Deploy to Vercel

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Create `vercel.json` in the `server/` folder**:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "index.ts",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "index.ts"
       }
     ],
     "env": {
       "NODE_ENV": "production"
     }
   }
   ```

3. **Deploy**:
   ```bash
   cd server
   vercel --prod
   ```

4. **Add Environment Variables** in Vercel Dashboard:
   - Go to your project → Settings → Environment Variables
   - Add:
     ```
     SUPABASE_URL=https://xxxxx.supabase.co
     SUPABASE_ANON_KEY=eyJ...
     AGENT_CIRCLE_WALLET_ID=your-wallet-id
     MCP_SERVER_URL=https://your-mcp-url.railway.app
     MCP_API_KEY=your-secret-key
     ```

5. **Redeploy** after adding variables:
   ```bash
   vercel --prod
   ```

**✅ Checkpoint**: Backend is deployed! Copy the URL (e.g., `https://your-backend.vercel.app`)

---

### **STEP 4: Deploy Frontend (React App)** 🎨

The user-facing website.

#### 4.1 Prepare Frontend for Deployment

1. **Navigate to root directory**:
   ```bash
   cd ..
   ```

2. **Create `.env.production` file** in root:
   ```env
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...your-key...
   VITE_GEMINI_API_KEY=your-gemini-api-key
   VITE_GEMINI_MODEL=gemini-2.5-flash
   VITE_PRIVY_APP_ID=your-privy-app-id
   VITE_AGENT_CIRCLE_WALLET_ID=your-wallet-id
   VITE_MCP_SERVER_URL=https://your-mcp-url.railway.app
   VITE_BACKEND_URL=https://your-backend.vercel.app
   ```

3. **Build the frontend**:
   ```bash
   npm install
   npm run build
   ```

#### 4.2 Deploy to Vercel

1. **Create `vercel.json` in root directory**:
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "devCommand": "npm run dev",
     "installCommand": "npm install",
     "framework": "vite",
     "rewrites": [
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```

2. **Deploy**:
   ```bash
   vercel --prod
   ```

3. **Add Environment Variables** in Vercel Dashboard:
   - Copy all variables from `.env.production`
   - Paste in Vercel → Settings → Environment Variables

4. **Redeploy**:
   ```bash
   vercel --prod
   ```

**✅ Checkpoint**: Your frontend is live! Visit the Vercel URL to see your app!

---

## 🔐 Environment Variables Setup

Here's a complete list of all environment variables you need:

### **Frontend (.env.production)**
```env
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Gemini AI
VITE_GEMINI_API_KEY=AIzaSy...
VITE_GEMINI_MODEL=gemini-2.5-flash

# Privy Authentication
VITE_PRIVY_APP_ID=cm...

# Circle Wallet
VITE_AGENT_CIRCLE_WALLET_ID=8a57ee78-...

# MCP Server
VITE_MCP_SERVER_URL=https://your-mcp.railway.app

# Backend
VITE_BACKEND_URL=https://your-backend.vercel.app
```

### **Backend (Vercel Environment Variables)**
```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...

# Circle
AGENT_CIRCLE_WALLET_ID=8a57ee78-...

# MCP Server
MCP_SERVER_URL=https://your-mcp.railway.app
MCP_API_KEY=dev-secret-key

# Environment
NODE_ENV=production
```

### **MCP Server (Railway/Render Environment Variables)**
```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...

# Circle
CIRCLE_API_KEY=your-circle-api-key
CIRCLE_ENTITY_SECRET=your-circle-entity-secret

# Environment
ENVIRONMENT=production
PORT=8000
```

---

## ✅ Deployment Checklist

Use this checklist to ensure everything is deployed correctly:

### **Database (Supabase)**
- [ ] Supabase project created
- [ ] Database credentials saved
- [ ] Migrations pushed successfully
- [ ] Tables created (check in Supabase Table Editor)

### **MCP Server (Railway/Render)**
- [ ] Python server deployed
- [ ] Environment variables configured
- [ ] Health check endpoint working (`/health`)
- [ ] Deployment URL saved

### **Backend (Vercel)**
- [ ] Node.js server deployed
- [ ] Environment variables configured
- [ ] API endpoints accessible
- [ ] Connected to Supabase
- [ ] Connected to MCP server

### **Frontend (Vercel)**
- [ ] React app built successfully
- [ ] Environment variables configured
- [ ] Deployed to Vercel
- [ ] Custom domain configured (optional)
- [ ] All pages loading correctly

---

## 🧪 Post-Deployment Verification

After deployment, test these critical flows:

### **1. Test Database Connection**
1. Open your frontend URL
2. Try to log in
3. Check if user data is saved in Supabase

### **2. Test MCP Server**
1. Visit `https://your-mcp-url/health`
2. Should return: `{"status": "healthy"}`

### **3. Test Backend**
1. Visit `https://your-backend-url/api/health`
2. Should return: `{"status": "ok"}`

### **4. Test Payment Flow**
1. Log in to the app
2. Try to create a payment intent
3. Check if payment processes correctly
4. Verify transaction appears in dashboard

### **5. Test Agent Chat**
1. Open Agent Chat
2. Send a test message
3. Verify AI responds correctly
4. Try a payment command

---

## 🐛 Troubleshooting Common Issues

### **Issue 1: "Cannot connect to database"**
**Solution**:
- Check Supabase URL and API key are correct
- Verify migrations ran successfully
- Check Supabase project is active

### **Issue 2: "MCP Server not responding"**
**Solution**:
- Check MCP server is deployed and running
- Visit `/health` endpoint to verify
- Check environment variables are set
- Check Railway/Render logs for errors

### **Issue 3: "Frontend shows blank page"**
**Solution**:
- Check browser console for errors
- Verify all `VITE_` environment variables are set
- Rebuild and redeploy: `npm run build && vercel --prod`

### **Issue 4: "Payment fails"**
**Solution**:
- Check Circle API credentials
- Verify wallet has sufficient balance
- Check MCP server logs
- Verify `AGENT_CIRCLE_WALLET_ID` is correct

### **Issue 5: "CORS errors"**
**Solution**:
- Add your frontend URL to backend CORS whitelist
- Check backend is deployed correctly
- Verify `VITE_BACKEND_URL` matches actual backend URL

---

## 🎉 Deployment Complete!

Congratulations! Your OmniAgentPay application is now live in production!

### **What You've Deployed:**
1. ✅ **Frontend** - User interface (Vercel)
2. ✅ **Backend** - API server (Vercel)
3. ✅ **MCP Server** - Payment processor (Railway/Render)
4. ✅ **Database** - Data storage (Supabase)

### **Next Steps:**
- Monitor application logs for errors
- Set up monitoring (e.g., Sentry, LogRocket)
- Configure custom domain
- Set up SSL certificates (auto with Vercel)
- Enable analytics
- Create backup strategy for database

### **Important URLs to Save:**
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-backend.vercel.app`
- MCP Server: `https://your-mcp.railway.app`
- Database: `https://xxxxx.supabase.co`

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Circle Developer Docs](https://developers.circle.com)

---

**Need Help?** Check the main [README.md](../README.md) or other documentation in the `docs/` folder.
