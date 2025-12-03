// Import Express request/response middleware types
import type { Request, Response, NextFunction } from 'express';

// ========== CUSTOM TYPES ==========
/**
 * Extended Response interface that includes statusCode property for logging
 */
interface ResponseWithLogging extends Response {
    // HTTP status code of the response
    statusCode: number;
}

// ========== REQUEST LOGGER MIDDLEWARE ==========
/**
 * Request logger middleware that logs all incoming requests and outgoing responses
 * Provides visual indicators for request method, path, status code, and response time
 */
export const requestLogger = (
    req: Request,
    res: ResponseWithLogging,
    next: NextFunction
) => {
    // Record start time for calculating response duration
    const start = Date.now();
    // Extract HTTP method (GET, POST, PUT, DELETE, etc.)
    const method = req.method;
    // Extract request path
    const path = req.path;
    // Build query string if query parameters exist
    const query = Object.keys(req.query).length > 0 ? JSON.stringify(req.query) : '';

    // Log incoming request with visual indicator (📨)
    console.log(`\n📨 [${method}] ${path} ${query ? '?' + query : ''}`);

    // Capture the original response send function before we override it
    const originalSend = res.send;

    // Override the send function to intercept responses and log them
    res.send = function (data: any) {
        // Calculate response duration in milliseconds
        const duration = Date.now() - start;
        // Extract HTTP status code from response
        const status = res.statusCode;

        // Color code the status based on HTTP status ranges
        let statusColor = '⚠️ ';
        // 2xx Success codes
        if (status >= 200 && status < 300) statusColor = '✅ ';
        // 3xx Redirect codes
        else if (status >= 300 && status < 400) statusColor = '🔀 ';
        // 4xx Client error codes
        else if (status >= 400 && status < 500) statusColor = '❌ ';
        // 5xx Server error codes
        else if (status >= 500) statusColor = '💥 ';

        // Log response with status code, duration, and visual indicator
        console.log(
            `${statusColor}[${status}] ${method} ${path} - ${duration}ms`
        );

        // Log request body for POST/PUT requests (limit to 100 characters)
        if ((method === 'POST' || method === 'PUT') && req.body) {
            console.log(`📤 Body:`, JSON.stringify(req.body, null, 2).substring(0, 100));
        }

        // Call the original send function to complete the response
        return originalSend.call(this, data);
    };

    // Call next middleware/route handler
    next();
};
