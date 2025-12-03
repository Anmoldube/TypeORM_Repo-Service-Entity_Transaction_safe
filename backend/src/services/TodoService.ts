// Import TypeORM DataSource for database connection
import { DataSource } from 'typeorm';
// Import TodoRepository for database operations
import { TodoRepository } from '../repositories/TodoRepository.ts';
// Import UserRepository for user validation
import { UserRepository } from '../repositories/UserRepository.ts';
// Import Todo enums for type safety
import { Priority, TodoStatus } from '../entities/Todo.ts';
// Import error message constants
import { ERROR_MESSAGES } from '../utils/constants.ts';
// Import TransactionManager for transaction handling
import { TransactionManager } from '../utils/TransactionManager.ts';

// ========== TODO SERVICE ==========
/**
 * TodoService handles business logic for todo operations
 * Acts as intermediary between controllers and repositories
 * Manages CRUD operations with validation and authorization
 */
export class TodoService {
  // TodoRepository instance for database operations
  private todoRepository: TodoRepository;
  // UserRepository instance for user validation
  private userRepository: UserRepository;
  // TransactionManager for managing dependent transactions
  private transactionManager: TransactionManager;

  /**
   * Constructor initializes the service with repositories
   * @param dataSource - TypeORM DataSource for database connection
   */
  constructor(dataSource: DataSource) {
    this.todoRepository = new TodoRepository(dataSource);
    this.userRepository = new UserRepository(dataSource);
    this.transactionManager = new TransactionManager(dataSource);
  }

  /**
   * Get all todos for a user with optional filtering and pagination
   * All operations are wrapped in a DEPENDENT transaction
   * Uses SERIALIZABLE isolation to ensure consistency
   * @param userId - User ID to fetch todos for
   * @param filters - Optional filters for status, priority, and due date
   * @param pagination - Optional pagination parameters (page, limit)
   * @returns Object with todos array and pagination metadata
   * @throws Error if user not found
   */
  async getTodos(
    userId: number,
    filters?: {
      // Filter by todo status (ACTIVE, COMPLETED, etc.)
      status?: TodoStatus;
      // Filter by priority (LOW, MEDIUM, HIGH)
      priority?: Priority;
      // Filter todos with due date on or before this date (ISO format string)
      dueDate?: string;
    },
    pagination?: {
      // Page number (1-indexed)
      page: number;
      // Number of todos per page
      limit: number;
    }
  ) {
    // Wrap entire operation in dependent transactions
    const results = await this.transactionManager.executeDependent<any>(
      [
        // Step 1: Validate user exists
        async (queryRunner) => {
          const userRepository = new UserRepository(queryRunner.manager);
          const user = await userRepository.findById(userId);
          if (!user) {
            throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
          }
          return user;
        },
        // Step 2: Fetch todos (depends on Step 1 - user validation)
        async (queryRunner) => {
          const todoRepository = new TodoRepository(queryRunner.manager);

          // Convert filter parameters to proper types
          const processedFilters = {
            status: filters?.status as TodoStatus | undefined,
            priority: filters?.priority as Priority | undefined,
            dueDate: filters?.dueDate ? new Date(filters.dueDate) : undefined,
          };

          // Fetch todos from repository - single find() for bulk lookup
          const result = await todoRepository.find(
            userId,
            undefined, // no specific todo ID
            processedFilters,
            pagination || { page: 1, limit: 10 }
          );

          if (result && typeof result === 'object' && 'todos' in result) {
            return result;
          }
          return { todos: [], total: 0 };
        },
      ],
      'SERIALIZABLE' // Highest isolation level - prevents all anomalies
    );

    const { todos, total } = results[1];

    // Return todos with pagination metadata
    return {
      todos,
      pagination: {
        page: pagination?.page || 1,
        limit: pagination?.limit || 10,
        total,
        // Calculate total number of pages
        pages: Math.ceil(total / (pagination?.limit || 10)),
      },
    };
  }

  /**
   * Get a single todo by ID
   * All operations are wrapped in a DEPENDENT transaction
   * Uses SERIALIZABLE isolation to ensure consistency
   * @param todoId - Todo ID to retrieve
   * @param userId - User ID for authorization check
   * @returns Todo object
   * @throws Error if user not found or todo not found
   */
  async getTodoById(todoId: number, userId: number) {
    // Wrap entire operation in dependent transactions
    const results = await this.transactionManager.executeDependent<any>(
      [
        // Step 1: Validate user exists
        async (queryRunner) => {
          const userRepository = new UserRepository(queryRunner.manager);
          const user = await userRepository.findById(userId);
          if (!user) {
            throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
          }
          return user;
        },
        // Step 2: Find todo (depends on Step 1 - user validation)
        async (queryRunner) => {
          const todoRepository = new TodoRepository(queryRunner.manager);
          const result = await todoRepository.find(userId, todoId);
          if (!result || typeof result === 'object' && 'todos' in result) {
            throw new Error(ERROR_MESSAGES.TODO_NOT_FOUND);
          }
          return result;
        },
      ],
      'SERIALIZABLE' // Highest isolation level - prevents all anomalies
    );

    // Return the todo from Step 2
    return results[1];
  }

  /**
   * Create a new todo for a user
   * All operations are wrapped in a DEPENDENT transaction for data consistency
   * Uses SERIALIZABLE isolation to prevent race conditions
   * @param text - Todo text/description
   * @param userId - User ID who creates the todo
   * @param priority - Optional priority level
   * @param dueDate - Optional due date (ISO format string)
   * @returns Created Todo object
   * @throws Error if validation fails or user not found
   */
  async createTodo(text: string, userId: number, priority?: Priority, dueDate?: string) {
    // Validate that todo text is not empty
    if (!text || text.trim().length === 0) {
      throw new Error(ERROR_MESSAGES.TODO_TEXT_REQUIRED);
    }

    // Wrap entire create operation in dependent transactions with SERIALIZABLE isolation
    // This ensures all steps execute atomically and prevents race conditions
    const results = await this.transactionManager.executeDependent<any>(
      [
        // Step 1: Validate user exists
        async (queryRunner) => {
          const userRepository = new UserRepository(queryRunner.manager);
          const user = await userRepository.findById(userId);
          if (!user) {
            throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
          }
          return user;
        },
        // Step 2: Create todo (only if user validation passed in Step 1)
        async (queryRunner) => {
          const todoRepository = new TodoRepository(queryRunner.manager);
          const todo = await todoRepository.create(
            text.trim(),
            userId,
            priority,
            dueDate ? new Date(dueDate) : undefined
          );
          return todo;
        },
      ],
      'SERIALIZABLE' // Highest isolation level - prevents all anomalies
    );

    // Return the created todo from Step 2
    return results[1];
  }

  /**
   * Update an existing todo
   * All operations are wrapped in a DEPENDENT transaction for data consistency
   * Uses SERIALIZABLE isolation to prevent race conditions
   * @param todoId - Todo ID to update
   * @param userId - User ID for authorization check
   * @param updates - Object containing fields to update
   * @returns Updated Todo object
   * @throws Error if validation fails or todo not found
   */
  async updateTodo(
    todoId: number,
    userId: number,
    updates: {
      // Optional new todo text
      text?: string;
      // Optional new status
      status?: TodoStatus;
      // Optional new priority
      priority?: Priority;
      // Optional new due date or null to clear
      dueDate?: string | null;
    }
  ) {
    // Wrap entire update operation in dependent transactions with SERIALIZABLE isolation
    const results = await this.transactionManager.executeDependent<any>(
      [
        // Step 1: Validate user exists AND todo exists and belongs to user
        async (queryRunner) => {
          const userRepository = new UserRepository(queryRunner.manager);
          const todoRepository = new TodoRepository(queryRunner.manager);

          const user = await userRepository.findById(userId);
          if (!user) {
            throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
          }

          const todo = await todoRepository.find(userId, todoId);
          if (!todo || typeof todo === 'object' && 'todos' in todo) {
            throw new Error(ERROR_MESSAGES.TODO_NOT_FOUND);
          }

          return { user, todo };
        },
        // Step 2: Perform the update (only if all validations passed in Step 1)
        async (queryRunner) => {
          const todoRepository = new TodoRepository(queryRunner.manager);

          // Build update data object with only provided fields
          const updateData: Record<string, any> = {};

          // Add text to update data if provided
          if (updates.text !== undefined) {
            updateData.text = updates.text.trim();
          }
          // Add status to update data if provided
          if (updates.status !== undefined) {
            updateData.status = updates.status;
          }
          // Add priority to update data if provided
          if (updates.priority !== undefined) {
            updateData.priority = updates.priority;
          }
          // Add due date to update data if provided (convert to Date or null)
          if (updates.dueDate !== undefined) {
            updateData.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
          }

          // Update todo in database using transaction context
          const updatedTodo = await todoRepository.update(todoId, userId, updateData);

          if (!updatedTodo) {
            throw new Error(ERROR_MESSAGES.UPDATE_TODO_FAILED);
          }

          return updatedTodo;
        },
      ],
      'SERIALIZABLE' // Highest isolation level - prevents all anomalies
    );

    // Return the updated todo from Step 2
    return results[1];
  }

  /**
   * Delete a todo (soft delete by marking as DELETED)
   * All operations are wrapped in a DEPENDENT transaction for data consistency
   * Uses SERIALIZABLE isolation to prevent race conditions
   * @param todoId - Todo ID to delete
   * @param userId - User ID for authorization check
   * @throws Error if validation fails or todo not found
   */
  async deleteTodo(todoId: number, userId: number) {
    // Wrap entire delete operation in dependent transactions with SERIALIZABLE isolation
    await this.transactionManager.executeDependent<any>(
      [
        // Step 1: Validate user exists AND todo exists and belongs to user
        async (queryRunner) => {
          const userRepository = new UserRepository(queryRunner.manager);
          const todoRepository = new TodoRepository(queryRunner.manager);

          const user = await userRepository.findById(userId);
          if (!user) {
            throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
          }

          const todo = await todoRepository.find(userId, todoId);
          if (!todo || typeof todo === 'object' && 'todos' in todo) {
            throw new Error(ERROR_MESSAGES.TODO_NOT_FOUND);
          }

          return { user, todo };
        },
        // Step 2: Perform the delete (only if all validations passed in Step 1)
        async (queryRunner) => {
          const todoRepository = new TodoRepository(queryRunner.manager);

          // Soft delete todo by marking status as DELETED using transaction context
          const deleted = await todoRepository.delete(todoId);
          if (!deleted) {
            throw new Error(ERROR_MESSAGES.DELETE_TODO_FAILED);
          }

          return deleted;
        },
      ],
      'SERIALIZABLE' // Highest isolation level - prevents all anomalies
    );

    return true;
  }
}
