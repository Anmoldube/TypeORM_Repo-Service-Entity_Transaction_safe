// Import jsonwebtoken for JWT token creation and verification
import jwt from 'jsonwebtoken';
// Import bcrypt for password hashing and comparison
import bcrypt from 'bcrypt';
// Import Express request/response/middleware types
import type { Request, Response, NextFunction } from 'express';
// Import HTTP status codes and error messages constants
import { HTTP_STATUS, ERROR_MESSAGES } from '../utils/constants.ts';

// Get JWT secret from environment variable or use default (should be changed in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ========== CUSTOM TYPES ==========
// Extend Express Request type to include authenticated user information
export interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
        email: string;
        name?: string;
    };
}

// ========== MIDDLEWARE ==========
/**
 * Authentication middleware that validates JWT tokens from request headers
 * Attaches user information to the request object if token is valid
 */
export const authenticateToken = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Extract authorization header from request
        const authHeader = req.headers.authorization;
        // Split "Bearer TOKEN" format to extract just the token part
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        // Check if token is present in the request
        if (!token) {
            res.status(HTTP_STATUS.UNAUTHORIZED).json({
                error: ERROR_MESSAGES.ACCESS_TOKEN_REQUIRED,
            });
            return;
        }

        // Verify JWT token using secret and extract user data from token payload
        const decoded = jwt.verify(token, JWT_SECRET) as {
            id: number;
            email: string;
            name?: string;
        };
        // Attach decoded user information to request object for use in route handlers
        req.user = {
            id: decoded.id,
            email: decoded.email,
            name: decoded.name,
        };

        // Call next middleware/route handler
        next();
    } catch (error) {
        // Log authentication errors to console
        console.error('Authentication error:', error);
        // Return forbidden status when token is invalid or expired
        res.status(HTTP_STATUS.FORBIDDEN).json({
            error: ERROR_MESSAGES.INVALID_TOKEN,
        });
    }
};

// ========== PASSWORD UTILITIES ==========
/**
 * Hash a plaintext password using bcrypt algorithm
 * @param password - Plaintext password to hash
 * @returns Promise with hashed password string
 */
export const hashPassword = async (password: string): Promise<string> => {
    // Number of salt rounds for bcrypt hashing (higher = more secure but slower)
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
};

/**
 * Compare a plaintext password with a bcrypt hash
 * @param password - Plaintext password to check
 * @param hash - Previously hashed password to compare against
 * @returns Promise with boolean indicating if passwords match
 */
export const verifyPassword = async (
    password: string,
    hash: string
): Promise<boolean> => {
    return bcrypt.compare(password, hash);
};

// ========== TOKEN GENERATION ==========
/**
 * Generate a JWT token for a user
 * @param user - User object containing id, email, and optional name
 * @returns JWT token string with 7-day expiration
 */
export const generateToken = (user: {
    id: number;
    email: string;
    name?: string;
}): string => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            name: user.name,
        },
        JWT_SECRET,
        // Token expires after 7 days
        { expiresIn: '7d' }
    );
};
