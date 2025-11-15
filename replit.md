# TrackWise - Apprenticeship Training Platform

## Overview
TrackWise is a full-stack SaaS apprenticeship management platform for tracking on-the-job (OTJ) training, evidence collection, and Knowledge, Skills, and Behaviors (KSB) progress. Built to compete with platforms like Aptem and OneFile, with features for multiple training providers.

**Technology Stack:**
- Frontend: React 18 + Vite 6 + TanStack Query
- Backend: Express.js + Drizzle ORM
- Database: PostgreSQL (Neon)
- Storage: Supabase (file uploads)
- AI: OpenAI (optional assistant features)

**Current Status:** ✅ **Ready for Use** - Authentication working, backend functional, frontend ready (add Supabase/OpenAI credentials for full features)

---

## Quick Start Guide

### Prerequisites - Environment Variables

**Required:**
- `DATABASE_URL` - PostgreSQL connection string (Neon or other PostgreSQL provider)
- `SESSION_SECRET` - Secret key for session encryption (generate a random string)

**Required for File Uploads:**
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

**Optional:**
- `OPENAI_API_KEY` - Enables AI assistant features
- `ENABLE_DB_SEED` - Set to "true" to enable database seeding on startup

### Running the Platform

**Current Setup (Production Mode):**
```bash
# Frontend is pre-built and served from Express on port 5000
# Just start the server - it's already configured!
```

The workflow automatically runs: `cd server && npx tsx index.ts`

**To Rebuild Frontend After Changes:**
```bash
cd client && npm run build
```

---

## Architecture & Design Decisions

### Storage Layer (Backend Data)
**Current:** MemStorage (fully functional, in-memory)
- ✅ All CRUD operations implemented
- ✅ Perfect for testing and development
- ⚠️ Data lost on restart
- ⚠️ Single-tenant only

**Future:** DatabaseStorage (PostgreSQL, incomplete)
- ⚠️ 20+ methods still need implementation
- 🎯 Required for production multi-tenant SaaS
- 📋 Priority: Auth → Learners → Evidence/OTJ → Reviews

**Configuration:**
```bash
# Environment variable (default: memory)
STORAGE_BACKEND=memory    # Use MemStorage (recommended for testing)
STORAGE_BACKEND=database  # Use DatabaseStorage (blocked until complete)
```

### Session Management
**Automatic Selection:**
- ✅ **With DATABASE_URL:** PostgreSQL-backed sessions (persistent)
- ✅ **Without DATABASE_URL:** In-memory sessions (lost on restart)

Both work seamlessly - system auto-detects and logs which is active.

### Frontend Deployment
**Production Approach (Current):**
- Frontend built to `client/dist`
- Express serves static files + API from port 5000
- Single deployment, single domain
- ✅ No CORS issues
- ✅ Session cookies work perfectly

**Development Alternative (Not Currently Setup):**
- Could run Vite dev server on port 5173 with proxy to backend
- Would provide hot-reload for faster development
- Can be added later if needed

---

## API Endpoints

**Authentication:**
- `POST /api/auth/register` - ✅ Working (creates users, sends email verification)
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

**OTJ Logs:**
- `/api/otj-logs/*` - CRUD for on-the-job training logs

**Evidence:**
- `/api/evidence/*` - Evidence item management

**Reviews:**
- `/api/reviews/*` - Tutor/IQA reviews

**AI Assistant:**
- `/api/ai-assistant/*` - AI-powered learning assistant (requires OPENAI_API_KEY)

**Reports:**
- `/api/reports/*` - Analytics and compliance reports

**ILR Data:**
- `/api/ilr/*` - Individualized Learner Record uploads

---

## Recent Fixes (November 15, 2025)

### ✅ Authentication System Repaired
**Issue:** Session data mismatch between login route and protected endpoints  
**Fix:** Updated login route to set `req.session.user` with proper structure including both `id` and `userId` fields  
**Impact:** All protected endpoints (OTJ logs, evidence, reviews, etc.) now accessible after login

### ✅ TypeScript Support for Supabase
**Issue:** Frontend TypeScript errors for Vite environment variables  
**Fix:** Created `client/src/vite-env.d.ts` with proper type definitions  
**Impact:** No more TypeScript errors, better IDE support for Supabase integration

### ✅ Weekly Tracking Authorization
**Issue:** Mixed user IDs and profile IDs causing authorization failures  
**Fix:** Properly separated learner USER ID (for authorization) from learner PROFILE ID (for storage queries)  
**Impact:** Weekly tracking endpoint now works correctly for all user roles

### ✅ Code Quality Improvements
**Fix:** Corrected TypeScript errors in server logging and storage method calls  
**Impact:** Cleaner codebase, better type safety

---

## Current Known Issues & Solutions

### 1. MemStorage Limitations (Expected)
**Status:** Working as designed for testing
**Details:** Some storage methods not implemented (e.g., deleteOtjLogEntry, getLearnerProfilesByTutorId)
**Impact:** Minimal - these are documented as incomplete in MemStorage
**Future:** Will be implemented in DatabaseStorage for production

### 2. AI Assistant (Optional)
**Status:** Requires OPENAI_API_KEY environment variable
**Setup:** Add your OpenAI API key as an environment secret
**Impact:** AI assistant features will be enabled once key is provided

### 3. Data Lost on Restart
**Cause:** Using MemStorage (in-memory)
**Fix:** This is expected behavior for testing
**Future:** Complete DatabaseStorage implementation for persistence

---

## Multi-Tenant SaaS Roadmap

Your goal: Multiple training providers using the platform with their own credentials and customization.

**Phase 1: Current State (Testing)**
- ✅ Backend API functional
- ✅ Frontend builds and loads
- ✅ MemStorage for rapid testing
- ⚠️ Single-tenant only

**Phase 2: Database Implementation (Required for Production)**
1. Complete DatabaseStorage methods
2. Add tenant_id columns to all tables
3. Implement row-level access control
4. Add tenant management API
5. Test multi-tenant data isolation

**Phase 3: Production Deployment**
1. Build frontend: `cd client && npm run build`
2. Deploy to hosting (Replit, Railway, Vercel, etc.)
3. Configure domain and SSL
4. Set up monitoring and backups
5. Implement billing integration

**Phase 4: Multi-Tenant Features**
1. Tenant onboarding flow
2. White-labeling / branding customization
3. Usage-based pricing integration
4. Admin dashboard for tenant management

---

## Environment Variables Reference

### Required Core Variables
- `SESSION_SECRET` - Session encryption key (must be set)
- `DATABASE_URL` - PostgreSQL connection string (must be set)

### Required for File Upload Features
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

### Optional Features
- `OPENAI_API_KEY` - AI assistant features
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` - Email notifications
- `ENABLE_DB_SEED` - Set to "true" to enable database seeding
- `STORAGE_BACKEND` - "memory" (default) or "database"
- `NODE_ENV` - "production" or "development"

---

## Security Notes

✅ **Implemented:**
- No hardcoded credentials (all removed)
- Session secret enforced in production
- Supabase credentials must be provided via env vars
- CORS configured properly
- PostgreSQL-backed sessions

⚠️ **Before Production:**
- Rotate any exposed Supabase keys
- Enable rate limiting on public endpoints
- Add input validation/sanitization
- Implement proper error handling (no stack traces to users)
- Set up monitoring and alerts

---

## Change History

### November 15, 2025 - Authentication & Bug Fixes
1. ✅ Fixed critical session data mismatch bug
2. ✅ Added TypeScript support for Supabase environment variables
3. ✅ Fixed weekly tracking route authorization logic (USER ID vs PROFILE ID)
4. ✅ Fixed TypeScript errors across backend (logging, imports)
5. ✅ Tested and verified authentication flow
6. ✅ Frontend now properly typed for Vite environment variables

**Note:** Supabase and OpenAI credentials must be added via environment variables for full functionality

### November 13, 2025 - Initial Migration
1. ✅ Backend API running on port 5000
2. ✅ Frontend built and served from Express
3. ✅ Storage factory pattern (MemStorage/DatabaseStorage)
4. ✅ Session management (PostgreSQL + fallback)
5. ✅ Security fixes (removed all hardcoded credentials)
6. ✅ Development defaults with production enforcement

### Next Steps
1. Test full user workflows through frontend UI
2. Begin DatabaseStorage implementation for persistence
3. Plan multi-tenancy architecture
4. Implement production deployment configuration

---

## Support & Resources

**Codebase Structure:**
- `/client` - React frontend (Vite + TanStack Query)
- `/server` - Express backend (ESM + tsx)
- `/shared` - Shared types and schemas (Drizzle + Zod)
- `/client/dist` - Built frontend (served by Express)

**Key Files:**
- `server/index.ts` - Main server entry point
- `server/storage.ts` - Storage layer interface + implementations
- `server/routes.ts` - API route definitions + session config
- `shared/schema.ts` - Database schema + Zod validation
- `vite.config.ts` - Frontend build configuration

**Logs:**
- Server logs: Available in workflow pane
- Browser console: Check developer tools
- Database logs: PostgreSQL connection logs

---

## Contact & Next Actions

**Ready for Testing!** 🎉

**To Start Testing:**
1. Provide Supabase credentials (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
2. Optionally add `OPENAI_API_KEY` for AI features
3. Access the platform at the Replit webview URL

**For Production Deployment:**
1. Review multi-tenant roadmap above
2. Complete DatabaseStorage implementation
3. Set up proper hosting with custom domain
4. Implement billing/subscription system

---

*Platform built for the apprenticeship training industry - competing with Aptem and OneFile with more affordable pricing and better customization.*
