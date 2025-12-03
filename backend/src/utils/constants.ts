// ========== HTTP STATUS CODES ==========
/**
 * HTTP_STATUS contains all standard HTTP status codes used in the application
 * Using constants prevents typos and makes status codes more maintainable
 */
export const HTTP_STATUS = {
    // 2xx Success responses
    OK: 200,                      // Standard successful HTTP request
    CREATED: 201,                 // Resource successfully created
    
    // 4xx Client error responses
    BAD_REQUEST: 400,             // Invalid request parameters or format
    UNAUTHORIZED: 401,            // Request requires authentication
    FORBIDDEN: 403,               // User authenticated but not authorized for resource
    NOT_FOUND: 404,               // Resource does not exist
    CONFLICT: 409,                // Request conflicts with existing resource (e.g., duplicate email)
    
    // 5xx Server error responses
    INTERNAL_SERVER_ERROR: 500,   // Unexpected server error
} as const;

// ========== ERROR MESSAGES ==========
/**
 * ERROR_MESSAGES contains all error messages used throughout the application
 * Centralizing messages ensures consistency and makes translations easier
 */
export const ERROR_MESSAGES = {
    // Authentication errors
    UNAUTHORIZED: 'Unauthorized',
    ACCESS_TOKEN_REQUIRED: 'Access token required',
    INVALID_TOKEN: 'Invalid or expired token',
    
    // User not found error
    USER_NOT_FOUND: 'User not found',
    
    // Todo not found error
    TODO_NOT_FOUND: 'Todo not found',
    
    // Validation errors
    EMAIL_PASSWORD_REQUIRED: 'Email and password are required',
    TODO_TEXT_REQUIRED: 'Todo text is required',
    
    // User registration errors
    USER_EXISTS: 'User already exists',
    REGISTRATION_FAILED: 'Failed to register user',
    
    // Login errors
    INVALID_CREDENTIALS: 'Invalid credentials',
    LOGIN_FAILED: 'Failed to login',
    
    // Todo operation errors
    FETCH_TODOS_FAILED: 'Failed to fetch todos',
    CREATE_TODO_FAILED: 'Failed to create todo',
    UPDATE_TODO_FAILED: 'Failed to update todo',
    DELETE_TODO_FAILED: 'Failed to delete todo',
    
    // Database errors
    DATABASE_ERROR: 'Database error',
} as const;

// ========== SUCCESS MESSAGES ==========
/**
 * SUCCESS_MESSAGES contains all success messages returned to clients
 * Centralizing messages provides consistent user feedback
 */
export const SUCCESS_MESSAGES = {
    // Todo deletion success
    TODO_DELETED: 'Todo deleted successfully',
    
    // Login success
    LOGIN_SUCCESS: 'Login successful',
} as const;
