// Import reflect-metadata for TypeORM decorators to work properly
import 'reflect-metadata';
// Load environment variables from .env file
import 'dotenv/config';
// Import Express.js framework for creating HTTP server
import express from 'express';
// Import CORS middleware to handle cross-origin requests
import cors from 'cors';
// Import TypeORM DataSource configured for PostgreSQL
import { AppDataSource } from './src/database/connection.ts';
// Import authentication routes (register, login)
import authRoutes from './src/routes/authRoutes.ts';
// Import todo management routes (CRUD operations)
import todoRoutes from './src/routes/todoRoutes.ts';
// Import HTTP status codes constants
import { HTTP_STATUS } from './src/utils/constants.ts';
// Import request logging middleware
import { requestLogger } from './src/middleware/logger.ts';

// Create Express application instance
const app = express();
// Define server port from environment variable or default to 3001
const PORT = process.env.PORT || 3001;

// ========== MIDDLEWARE SETUP ==========
// Enable CORS to allow requests from different origins
app.use(cors());
// Parse incoming JSON request bodies
app.use(express.json());
// Apply request logging middleware to all requests
app.use(requestLogger);

// ========== HEALTH CHECK ROUTES ==========
// Root endpoint that returns server status message
app.get('/', (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    message: 'ToDo API Server is running!',
  });
});

// Health check endpoint to verify server is running
app.get('/api/health', (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

// Database status endpoint to check PostgreSQL connection and data stats
app.get('/api/db-status', async (req, res) => {
  try {
    // Check if database is initialized
    if (!AppDataSource.isInitialized) {
      throw new Error('Database not initialized');
    }

    // Get repository instances for User and Todo entities
    const userRepository = AppDataSource.getRepository('User');
    const todoRepository = AppDataSource.getRepository('Todo');

    // Count total users and todos in database
    const users = await userRepository.count();
    const todos = await todoRepository.count();

    // Return successful database connection response with statistics
    res.status(HTTP_STATUS.OK).json({
      status: 'CONNECTED',
      database: 'PostgreSQL (via TypeORM)',
      timestamp: new Date().toISOString(),
      message: 'Database connection successful',
      stats: {
        users,
        todos,
      },
    });
  } catch (error) {
    // Log database connection error to console
    console.error('Database connection error:', error);
    // Return error response when database is not accessible
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'DISCONNECTED',
      database: 'PostgreSQL (via TypeORM)',
      timestamp: new Date().toISOString(),
      message: 'Failed to connect to database',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ========== API ROUTES REGISTRATION ==========
// Mount authentication routes (register/login) at /api/auth prefix
app.use('/api/auth', authRoutes);
// Mount todo CRUD routes at /api/todos prefix
app.use('/api/todos', todoRoutes);

// ========== 404 NOT FOUND HANDLER ==========
// Handle requests to undefined routes
app.use((req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    error: 'Route not found',
    path: req.path,
    method: req.method,
  });
});

// ========== GLOBAL ERROR HANDLER ==========
// Catch and handle all unhandled errors from routes and middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    // Log error details to console
    console.error('Unhandled error:', err);
    // Return generic error response to client
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Internal server error',
      message: err.message || 'Unknown error',
    });
  }
);

// ========== SERVER STARTUP ==========
// Start Express server on specified port
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);

  try {
    // Initialize database connection if not already initialized
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    console.log('Database connected successfully');
  } catch (error) {
    // Log database connection errors
    console.error('Failed to connect to database:', error);
  }
});

// ========== GRACEFUL SHUTDOWN ==========
// Handle process termination signal (Ctrl+C)
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  // Properly close database connection before exiting
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  // Exit process
  process.exit(0);
});