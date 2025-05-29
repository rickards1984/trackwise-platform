# Backend Deployment Guide

## Railway Deployment Steps

1. **Create Railway Project**
   ```bash
   railway login
   railway init
   ```

2. **Add PostgreSQL Database**
   ```bash
   railway add postgresql
   ```

3. **Set Environment Variables**
   ```bash
   railway variables set SESSION_SECRET="your-secure-session-secret"
   railway variables set FRONTEND_URL="https://your-vercel-app.vercel.app"
   ```

4. **Deploy**
   ```bash
   railway up
   ```

## Required Environment Variables

- `DATABASE_URL` - Automatically provided by Railway PostgreSQL
- `SESSION_SECRET` - Generate a secure random string
- `FRONTEND_URL` - Your Vercel frontend URL
- `PORT` - Automatically provided by Railway

## Health Check

The backend exposes a health check endpoint at `/api/health`

## Database Setup

After deployment, run database migrations:
```bash
railway run npm run db:push
```
