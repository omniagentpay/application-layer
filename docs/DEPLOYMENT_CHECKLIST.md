# 📋 Production Deployment Checklist

Quick reference checklist for deploying OmniAgentPay to production.

---

## 🎯 Pre-Deployment Preparation

### **Accounts & Services Setup**
- [ ] Vercel account created and verified
- [ ] Supabase account created and verified
- [ ] Railway/Render account created and verified
- [ ] Circle developer account created
- [ ] Google AI Studio API key obtained
- [ ] Privy app created and configured

### **Local Development Verification**
- [ ] Application runs successfully with `npm run dev`
- [ ] Backend runs successfully with `cd server && npm run dev`
- [ ] MCP server runs successfully
- [ ] All tests pass (`npm run test`)
- [ ] No console errors in development
- [ ] All features working locally

### **Code Preparation**
- [ ] All changes committed to Git
- [ ] Code pushed to GitHub/GitLab
- [ ] `.env.production` file created (not committed!)
- [ ] All secrets documented securely
- [ ] Production build tested locally (`npm run build`)

---

## 🗄️ Database Deployment (Supabase)

### **Step 1: Create Project**
- [ ] New Supabase project created
- [ ] Project name: `omniagentpay-production`
- [ ] Region selected (closest to users)
- [ ] Database password saved securely

### **Step 2: Get Credentials**
- [ ] Project URL copied
- [ ] Anon/Public key copied
- [ ] Service role key copied (if needed)
- [ ] Credentials saved in password manager

### **Step 3: Run Migrations**
- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Project linked (`npx supabase link`)
- [ ] Migrations pushed (`npx supabase db push`)
- [ ] Migration status verified (`npx supabase migration list`)
- [ ] Tables visible in Supabase Table Editor

### **Step 4: Verify Database**
- [ ] All expected tables created
- [ ] Row Level Security (RLS) policies active
- [ ] Database accessible from external services

---

## 🐍 MCP Server Deployment (Railway/Render)

### **Step 1: Prepare MCP Server**
- [ ] `requirements.txt` file exists
- [ ] `omniagentpay` package included
- [ ] Entry point file exists (`app/main.py`)
- [ ] Health check endpoint implemented

### **Step 2: Deploy to Railway/Render**
- [ ] New project/service created
- [ ] Repository connected
- [ ] Root directory set to `mcp-server`
- [ ] Start command configured: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- [ ] Python version specified (3.11+)

### **Step 3: Configure Environment Variables**
- [ ] `SUPABASE_URL` added
- [ ] `SUPABASE_ANON_KEY` added
- [ ] `CIRCLE_API_KEY` added
- [ ] `CIRCLE_ENTITY_SECRET` added
- [ ] `ENVIRONMENT=production` added
- [ ] `PORT` configured (if needed)

### **Step 4: Verify Deployment**
- [ ] Build completed successfully
- [ ] Service is running
- [ ] Health endpoint accessible: `https://your-mcp-url/health`
- [ ] Logs show no errors
- [ ] Deployment URL saved

---

## 🖥️ Backend Deployment (Vercel)

### **Step 1: Prepare Backend**
- [ ] Navigate to `server/` folder
- [ ] Dependencies installed (`npm install`)
- [ ] Build successful (`npm run build`)
- [ ] `vercel.json` created in `server/` folder

### **Step 2: Deploy to Vercel**
- [ ] Vercel CLI installed (`npm install -g vercel`)
- [ ] Logged in to Vercel (`vercel login`)
- [ ] Deployed from `server/` folder (`vercel --prod`)
- [ ] Deployment successful

### **Step 3: Configure Environment Variables**
- [ ] `SUPABASE_URL` added
- [ ] `SUPABASE_ANON_KEY` added
- [ ] `AGENT_CIRCLE_WALLET_ID` added
- [ ] `MCP_SERVER_URL` added (Railway/Render URL)
- [ ] `MCP_API_KEY` added
- [ ] `NODE_ENV=production` added

### **Step 4: Redeploy with Variables**
- [ ] Redeployed after adding variables (`vercel --prod`)
- [ ] Build successful
- [ ] Deployment URL saved

### **Step 5: Verify Backend**
- [ ] Health endpoint accessible: `https://your-backend-url/api/health`
- [ ] API endpoints responding
- [ ] Connected to Supabase (test query)
- [ ] Connected to MCP server
- [ ] Logs show no errors

---

## 🎨 Frontend Deployment (Vercel)

### **Step 1: Prepare Frontend**
- [ ] Navigate to root directory
- [ ] `.env.production` file created
- [ ] All `VITE_*` variables configured
- [ ] Dependencies installed (`npm install`)
- [ ] Build successful (`npm run build`)
- [ ] `dist/` folder generated

### **Step 2: Create Vercel Configuration**
- [ ] `vercel.json` created in root
- [ ] Build command set: `npm run build`
- [ ] Output directory set: `dist`
- [ ] Framework set: `vite`
- [ ] Rewrites configured for SPA

### **Step 3: Deploy to Vercel**
- [ ] Deployed from root folder (`vercel --prod`)
- [ ] Deployment successful
- [ ] Deployment URL saved

### **Step 4: Configure Environment Variables**
- [ ] `VITE_SUPABASE_URL` added
- [ ] `VITE_SUPABASE_ANON_KEY` added
- [ ] `VITE_GEMINI_API_KEY` added
- [ ] `VITE_GEMINI_MODEL` added
- [ ] `VITE_PRIVY_APP_ID` added
- [ ] `VITE_AGENT_CIRCLE_WALLET_ID` added
- [ ] `VITE_MCP_SERVER_URL` added
- [ ] `VITE_BACKEND_URL` added

### **Step 5: Redeploy with Variables**
- [ ] Redeployed after adding variables (`vercel --prod`)
- [ ] Build successful
- [ ] All environment variables embedded

### **Step 6: Verify Frontend**
- [ ] Application loads without errors
- [ ] All pages accessible
- [ ] No console errors
- [ ] Assets loading correctly
- [ ] API calls working

---

## 🧪 Post-Deployment Testing

### **Database Tests**
- [ ] User registration works
- [ ] User login works
- [ ] Data persists correctly
- [ ] Queries return expected results

### **MCP Server Tests**
- [ ] Health endpoint returns 200
- [ ] Payment tools accessible
- [ ] Wallet operations work
- [ ] Transaction processing works

### **Backend Tests**
- [ ] Health endpoint returns 200
- [ ] All API routes accessible
- [ ] Authentication works
- [ ] Database queries work
- [ ] MCP server integration works

### **Frontend Tests**
- [ ] Homepage loads
- [ ] Login/signup works
- [ ] Dashboard displays correctly
- [ ] Agent chat works
- [ ] Payment flows work
- [ ] Wallet displays correctly
- [ ] All navigation works

### **Integration Tests**
- [ ] End-to-end payment flow works
- [ ] Agent can request payments
- [ ] Guard policies evaluate correctly
- [ ] Transactions execute successfully
- [ ] Receipts generated correctly

---

## 🔒 Security Verification

### **Environment Variables**
- [ ] No secrets in Git repository
- [ ] All `.env` files in `.gitignore`
- [ ] Production secrets different from development
- [ ] API keys rotated from development

### **Database Security**
- [ ] Row Level Security (RLS) enabled
- [ ] Service role key secured
- [ ] Database password strong
- [ ] Only necessary permissions granted

### **API Security**
- [ ] CORS configured correctly
- [ ] Rate limiting enabled (if applicable)
- [ ] Authentication required for protected routes
- [ ] Input validation implemented

### **Application Security**
- [ ] HTTPS enabled (automatic with Vercel)
- [ ] CSP headers configured
- [ ] XSS protection enabled
- [ ] No sensitive data in client-side code

---

## 🎛️ Configuration & Optimization

### **Domain Setup (Optional)**
- [ ] Custom domain purchased
- [ ] DNS configured
- [ ] Domain added to Vercel
- [ ] SSL certificate issued (automatic)

### **Performance Optimization**
- [ ] Build size optimized
- [ ] Code splitting enabled
- [ ] Images optimized
- [ ] Lazy loading implemented
- [ ] CDN configured (automatic with Vercel)

### **Monitoring Setup**
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Analytics configured
- [ ] Uptime monitoring configured
- [ ] Log aggregation configured

---

## 📊 Final Verification

### **URLs Documented**
- [ ] Frontend URL: `___________________________`
- [ ] Backend URL: `___________________________`
- [ ] MCP Server URL: `___________________________`
- [ ] Database URL: `___________________________`

### **Credentials Secured**
- [ ] All passwords in password manager
- [ ] All API keys documented
- [ ] Recovery codes saved
- [ ] Team access configured

### **Documentation Updated**
- [ ] README.md updated with production URLs
- [ ] Environment variables documented
- [ ] Deployment process documented
- [ ] Team members notified

### **Backup & Recovery**
- [ ] Database backup configured
- [ ] Code repository backed up
- [ ] Environment variables backed up
- [ ] Recovery plan documented

---

## ✅ Deployment Complete!

**Date Deployed**: _______________

**Deployed By**: _______________

**Production URLs**:
- Frontend: _______________
- Backend: _______________
- MCP Server: _______________

**Next Steps**:
- [ ] Monitor logs for 24 hours
- [ ] Test all critical user flows
- [ ] Announce to stakeholders
- [ ] Schedule first maintenance window

---

## 🆘 Rollback Plan

If something goes wrong:

1. **Frontend Issues**:
   - Revert to previous deployment in Vercel dashboard
   - Or: `vercel rollback`

2. **Backend Issues**:
   - Revert to previous deployment in Vercel dashboard
   - Check logs: `vercel logs`

3. **MCP Server Issues**:
   - Rollback in Railway/Render dashboard
   - Check service logs

4. **Database Issues**:
   - Restore from Supabase backup
   - Or: Revert migrations

**Emergency Contact**: _______________

---

**Last Updated**: January 22, 2026
