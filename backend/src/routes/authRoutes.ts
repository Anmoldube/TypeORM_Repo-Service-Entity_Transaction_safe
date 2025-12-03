// Import Express Router for route management
import express from 'express';
// Import authentication controller methods
import { authController } from '../controllers/authController.ts';

// Create router instance for auth routes
const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user with email and password
 * Request body: { email: string, password: string, name?: string }
 * Response: { user: { id, email, name }, token: string }
 */
router.post('/register', authController.register);

/**
 * POST /api/auth/login
 * Login user with email and password and return JWT token
 * Request body: { email: string, password: string }
 * Response: { user: { id, email, name }, token: string }
 */
router.post('/login', authController.login);

// Export router for use in main app
export default router;
