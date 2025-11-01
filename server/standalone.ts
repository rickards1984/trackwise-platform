// @ts-nocheck
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { seedDatabase } from "./seed";
import fileUpload from "express-fileupload";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const app = express();

// CORS configuration for production deployment
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
};

app.use(cors(corsOptions));

// Trust proxy for Railway deployment
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  abortOnLimit: true,
  responseOnLimit: "File size limit has been reached (50MB)"
}));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Health check endpoint for Railway
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      console.log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  // Seed the database with initial data
  try {
    await seedDatabase();
    console.log('Database seeding completed');
  } catch (error) {
    console.log('Error seeding database:', error);
  }

  // Register main routes
  const server = await registerRoutes(app);
  
  // Register report routes
  try {
    const { registerReportsRoutes } = await import('./routes/reports');
    registerReportsRoutes(app);
  } catch (error) {
    console.log('Error registering report routes:', error);
  }

  // 404 handler for unmatched API routes
  app.use('/api/*', notFoundHandler);
  
  // Global error handler
  app.use(errorHandler);

  // Use Railway's PORT environment variable or default to 5000
  const port = parseInt(process.env.PORT || "5000", 10);
  
  server.listen(port, "0.0.0.0", () => {
    console.log(`Backend server running on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  });
})();