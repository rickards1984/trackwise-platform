# Deployment Guide for TrackWise Platform

This document provides instructions for deploying the TrackWise platform to Vercel and other hosting providers.

## Architecture Overview

TrackWise is a TypeScript monorepo with two workspaces:
- **client**: Vite-based React frontend
- **server**: Express.js TypeScript backend

## Vercel Deployment

### Recommended Configuration

The repository is configured to deploy the **server backend** to Vercel with the following settings:

**vercel.json**:
```json
{
  "buildCommand": "cd server && npm ci && npm run build",
  "outputDirectory": "server/dist",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://trackwise-platform-production.up.railway.app/api/:path*"
    }
  ]
}
```

### Build Process

1. **Build Command**: `cd server && npm ci && npm run build`
   - Changes to the server directory
   - Installs dependencies (including devDependencies needed for TypeScript compilation)
   - Runs TypeScript compiler (`tsc -p .`) to build the server

2. **Output Directory**: `server/dist`
   - TypeScript compiles source files from `server/src/` to `server/dist/`
   - The compiled JavaScript files are served by Vercel

3. **Rewrites**: API requests are proxied to Railway
   - If the backend remains on Railway, API calls are forwarded to the Railway deployment
   - Alternatively, remove rewrites to deploy the server directly on Vercel

### Environment Variables

Set these environment variables in the Vercel dashboard:

**Required:**
- `DATABASE_URL` - PostgreSQL/Neon database connection string
- `SESSION_SECRET` - Secret for Express session management
- `SENDGRID_API_KEY` - SendGrid API key for email (if using email features)

**Optional:**
- `PORT` - Server port (defaults to 5000)
- `NODE_ENV` - Set to `production`
- `OPENAI_API_KEY` - If using AI features

### Frontend Deployment

If deploying the client separately to Vercel:

1. Set build command: `cd client && npm ci && npm run build`
2. Set output directory: `client/dist`
3. Set environment variable: `NEXT_PUBLIC_API_BASE=https://your-api-domain.com`

## Railway Deployment

The server can also be deployed to Railway using the provided Dockerfile:

### Docker Build

The multi-stage Dockerfile:
1. **Builder stage**: Installs all dependencies and compiles TypeScript
2. **Production stage**: Copies built artifacts and installs only production dependencies

### Railway Configuration

Create a `railway.json` or configure via Railway dashboard:
- **Build Command**: Uses Dockerfile automatically
- **Start Command**: `npm start` (runs `node dist/index.js`)

### Environment Variables (Railway)

Same as Vercel environment variables listed above.

## Troubleshooting

### Common Issues

#### 1. "ENOENT: no such file or directory, open 'client/package.json'"

**Cause**: `.vercelignore` was removing `package.json` files before build.

**Solution**: Updated `.vercelignore` to only ignore build artifacts and `node_modules`, not source files or package manifests.

#### 2. "Cannot find module 'dist/index.js'"

**Cause**: Build not running properly, or wrong output directory configured.

**Solution**: 
- Verify `buildCommand` includes `npm ci && npm run build`
- Confirm `outputDirectory` matches TypeScript's `outDir` in `tsconfig.json` (should be `server/dist`)

#### 3. "npm install failed"

**Cause**: Build command not installing dependencies before compilation.

**Solution**: Use `npm ci` in the build command to ensure clean dependency installation.

#### 4. TypeScript compilation errors

**Cause**: Missing devDependencies or wrong TypeScript configuration.

**Solution**: 
- Ensure `npm ci` installs all dependencies (not `--only=production`)
- Check `server/tsconfig.json` for correct `outDir` and `include` paths
- Verify all required `@types/*` packages are in `devDependencies`

### Vercel Build Logs

To debug deployment issues:
1. Go to Vercel dashboard → Your Project → Deployments
2. Click on the failed deployment
3. View the build logs to identify the specific error
4. Common errors include missing dependencies, TypeScript errors, or incorrect paths

### Testing Locally

Before deploying, test the build locally:

```bash
# Install dependencies
npm ci

# Build the server
cd server && npm run build

# Start the server
npm start
```

Visit `http://localhost:5000` to verify the server is running.

## Architecture Decisions

### Why deploy server to Vercel?

Vercel provides:
- Automatic HTTPS
- Global CDN
- Serverless functions (though we use Node.js runtime)
- Easy integration with GitHub

### Why use Railway for backend?

Railway provides:
- Persistent storage
- Long-running processes
- WebSocket support
- Database hosting

### Hybrid Approach

Current setup uses Railway for the main backend and Vercel for frontend/API proxy. This allows:
- Frontend static assets on Vercel's CDN
- Backend on Railway with persistent connections and storage
- API proxy routes requests from Vercel to Railway

## Maintenance

### Updating Dependencies

```bash
# Update all workspaces
npm update --workspaces

# Update specific workspace
npm --workspace=server update
npm --workspace=client update
```

### Monitoring

- Monitor Vercel deployment status via dashboard
- Check Railway logs for backend errors
- Set up error tracking (e.g., Sentry) for production monitoring

## Support

For deployment issues:
1. Check build logs in Vercel/Railway dashboard
2. Review this troubleshooting guide
3. Verify environment variables are set correctly
4. Test build locally before deploying
