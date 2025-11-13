# TrackWise - Apprenticeship Training Platform

## Overview
TrackWise is a full-stack apprenticeship management platform for tracking on-the-job (OTJ) training, evidence collection, and Knowledge, Skills, and Behaviors (KSB) progress. Built with React + Vite frontend and Express backend, using PostgreSQL database.

**Current State:** Backend API server successfully migrated to Replit and running on port 5000. Frontend (Vite) temporarily isolated on port 5173 pending integration.

## Recent Changes (November 13, 2025)

### Completed Migration Tasks
1. ✅ **Environment Setup**: Configured DATABASE_URL and SESSION_SECRET
2. ✅ **ESM Conversion**: Migrated server from CommonJS to full ESM support
3. ✅ **Security Fix**: Removed hardcoded Supabase credentials (now requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY)
4. ✅ **Safety Guards**: Database seeding now requires ENABLE_DB_SEED=true flag
5. ✅ **Vercel Cleanup**: Removed vercel.json and railway.json files
6. ✅ **Backend Running**: Express API server operational on port 5000
7. ✅ **Optional Services**: Made OpenAI API integration gracefully handle missing keys

### Pending Tasks
- Re-enable Vite middleware for frontend integration
- Request Supabase credentials from user (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- Configure deployment settings for production
- Test full-stack integration with database

## Project Architecture

### Technology Stack
- **Frontend**: React 18, Vite 6, TanStack Query, Wouter routing
- **Backend**: Express.js, Drizzle ORM
- **Database**: PostgreSQL (Neon)
- **Storage**: Supabase (requires configuration)
- **AI**: OpenAI integration (optional)

### Project Structure
```
/
├── client/           # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Utilities (Supabase, etc)
│   │   └── pages/       # Route components
├── server/           # Express backend
│   ├── index.ts         # Main server entry
│   ├── routes.ts        # API route definitions
│   ├── db.ts            # Database connection
│   └── middleware/      # Express middleware
├── shared/           # Shared types/schemas
│   └── schema.ts        # Drizzle schema definitions
└── package.json      # Monorepo root
```

### Port Configuration
- Backend API: `5000` (Express)
- Frontend Dev: `5173` (Vite)
- Database: PostgreSQL via DATABASE_URL

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string ✅ Configured
- `SESSION_SECRET` - Express session secret ✅ Configured
- `VITE_SUPABASE_URL` - Supabase project URL ⚠️ Required for file uploads
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key ⚠️ Required for file uploads

### Optional
- `OPENAI_API_KEY` - For AI assistant features
- `ENABLE_DB_SEED` - Set to "true" to enable database seeding
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` - For email notifications

## Known Issues

### TypeScript Errors
- ~143 TypeScript errors exist (missing database methods, type mismatches)
- Running in `transpileOnly` mode to bypass for development
- These need systematic fixing before production deployment

### Frontend Integration
- Vite middleware temporarily disabled due to module import issues
- Frontend and backend running on separate ports
- Need to restore integrated dev server once import issues resolved

### Database
- Schema defined but some CRUD operations not implemented
- Seeding blocked by ENABLE_DB_SEED flag (safety measure)

## User Preferences
- User is non-technical, prefers clear explanations
- Focus on debugging before adding new features
- Prioritize backend stability, then frontend integration

## Next Steps
1. Request Supabase credentials from user
2. Fix Vite createServer import issue to restore frontend integration
3. Address critical TypeScript errors
4. Test database operations
5. Configure deployment for production
