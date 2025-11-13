import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { seedDatabase } from "./seed";
import fileUpload from "express-fileupload";
import path from "path";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import cors from "cors";

function log(message: string) {
  console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
}

const app = express(); // ✅ Only define once!

// ✅ CORS middleware setup (after app is defined)
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

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
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      log(logLine);
    }
  });
  next();
});

(async () => {
  if (process.env.ENABLE_DB_SEED === 'true') {
    try {
      await seedDatabase();
      log('Database seeding completed');
    } catch (error) {
      log('Error seeding database:', error);
    }
  }

  const server = await registerRoutes(app);

  try {
    const { registerReportsRoutes } = await import('./routes/reports');
    registerReportsRoutes(app);
  } catch (error) {
    log('Error registering report routes:', error);
  }

  app.use('/api/*', notFoundHandler);
  app.use(errorHandler);

  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    console.log(`Backend API server running on port ${port}`);
  });
})();
