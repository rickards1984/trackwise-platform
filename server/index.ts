import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./seed";
import fileUpload from "express-fileupload";
import path from "path";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import cors from "cors";

// CORS middleware setup
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));


const app = express();
// Must be set before rate limiters!
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  abortOnLimit: true,
  responseOnLimit: "File size limit has been reached (50MB)"
}));

// Serve uploaded files from the project root
app.use('/uploads', express.static('uploads'));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  // Security-enhanced logging without capturing sensitive response data
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Only log the method, path, status code and duration without sensitive response data
      const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      log(logLine);
    }
  });

  next();
});

(async () => {
  // Seed the database with initial data
  try {
    await seedDatabase();
    log('Database seeding completed');
  } catch (error) {
    log('Error seeding database:', error);
  }

  // Register main routes
  const server = await registerRoutes(app);
  
  // Register report routes
  try {
    const { registerReportsRoutes } = await import('./routes/reports');
    registerReportsRoutes(app);
  } catch (error) {
    log('Error registering report routes:', error);
  }

  // Use the 404 handler for unmatched routes after all API routes
  app.use('/api/*', notFoundHandler);
  
  // Use the global error handler
  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
