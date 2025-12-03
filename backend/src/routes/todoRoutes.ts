// Import Express Router for route management
import express from 'express';
// Import authentication middleware to protect routes
import { authenticateToken } from '../middleware/auth.ts';
// Import todo controller methods
import { todoController } from '../controllers/todoController.ts';

// Create router instance for todo routes
const router = express.Router();

/**
 * GET /api/todos
 * Get all todos for authenticated user with optional filtering and pagination
 * Authentication: Required (Bearer token)
 * Query params:
 *   - status: Filter by status (ACTIVE, COMPLETED, DELETED)
 *   - priority: Filter by priority (LOW, MEDIUM, HIGH)
 *   - dueDate: Filter todos with due date on or before this date (ISO format)
 *   - page: Page number for pagination (default: 1)
 *   - limit: Number of todos per page (default: 10)
 * Response: { todos: [], pagination: { page, limit, total, pages } }
 */
router.get('/', authenticateToken, todoController.getTodos);

/**
 * GET /api/todos/:id
 * Get a single todo by ID (only if user owns the todo)
 * Authentication: Required (Bearer token)
 * URL params:
 *   - id: Todo ID to retrieve
 * Response: { todo: { id, text, status, priority, dueDate, createdAt, updatedAt } }
 */
router.get('/:id', authenticateToken, todoController.getTodoById);

/**
 * POST /api/todos
 * Create a new todo for the authenticated user
 * Authentication: Required (Bearer token)
 * Request body: { text: string, priority?: 'LOW' | 'MEDIUM' | 'HIGH', dueDate?: string }
 * Response: { todo: { id, text, status, priority, dueDate, createdAt, updatedAt } }
 */
router.post('/', authenticateToken, todoController.createTodo);


/**
 * PUT /api/todos/:id
 * Update an existing todo (only if user owns the todo)
 * Authentication: Required (Bearer token)
 * URL params:
 *   - id: Todo ID to update
 * Request body: { text?: string, status?: string, priority?: string, dueDate?: string | null }
 * Response: { todo: { id, text, status, priority, dueDate, createdAt, updatedAt } }
 */
router.put('/:id', authenticateToken, todoController.updateTodo);

/**
 * DELETE /api/todos/:id
 * Soft delete a todo (mark as DELETED, don't remove from database)
 * Authentication: Required (Bearer token)
 * URL params:
 *   - id: Todo ID to delete
 * Response: { message: 'Todo deleted successfully' }
 */
router.delete('/:id', authenticateToken, todoController.deleteTodo);

// Export router for use in main app
export default router;
