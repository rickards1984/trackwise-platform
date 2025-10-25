# Deployment notes — Trackwise Platform

This file includes recommended steps to deploy the monorepo to Vercel and to build Docker images for Railway.

## Vercel (recommended for frontend or full serverless)
Option A — Frontend on Vercel, backend on Railway (recommended)
1. In Vercel project settings:
   - Root directory: (leave as repo root)
   - Build Command: cd server && npm ci && npm run build
   - Output Directory: server/dist
2. Remove any rewrite mapping that proxies `/api/*` from Vercel to Railway, and instead set a runtime env var for the client:
   - NEXT_PUBLIC_API_BASE=https://trackwise-platform-production.up.railway.app
   - Use the env var in the client to call the API.
3. Ensure required runtime environment variables are set in Vercel (do not store secrets in client-visible vars):
   - SERVER_ONLY variables (if you move server to Vercel): DB_URL, JWT_SECRET, etc.
   - CLIENT vars (prefixed with NEXT_PUBLIC_) for public API base URL.

Option B — Deploy server to Vercel
1. In Vercel project settings:
   - Root directory: repo root (or set to /server if you prefer)
   - Build Command: npm ci && npm run build  OR cd server && npm ci && npm run build
   - Output Directory: server/dist (or change to server/.next if using Next server)
2. Add server-only environment variables in Vercel (DB connection strings, secrets).

## Docker / Railway
- Use the Dockerfile at repo root to build an image for the server.
- The Dockerfile is a multi-stage build: build in `builder` stage and copy artifacts to `runner`.
- Build locally: docker build -t trackwise-server:local .
- Run locally: docker run -p 5000:5000 --env-file .env trackwise-server:local

## Troubleshooting
- If Vercel build fails with "ENOENT: no such file or directory" for client/package.json or package.json — check .vercelignore and ensure it does not remove these files before build.
- If TypeScript errors appear during build, run `cd server && npm ci && npm run build` locally and send the output; I will propose fixes.
- If your server uses a different build output (e.g., .next, build), update vercel.json outputDirectory accordingly.