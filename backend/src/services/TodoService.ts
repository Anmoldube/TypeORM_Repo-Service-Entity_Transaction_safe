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
  // TransactionManager for managing transactions
  private transactionManager: TransactionManager;
  // Store dataSource for creating repositories in transaction context
  private dataSource: DataSource;

  /**
   * Constructor initializes the service with DataSource
   * @param dataSource - TypeORM DataSource for database connection
   */
  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.transactionManager = new TransactionManager(dataSource);
  }

  /**
   * CORE TRANSACTION FUNCTION - All todo operations use this
   * Executes a transaction block with SERIALIZABLE isolation
   * Automatically handles user validation and database context
   * @param operation - The operation to perform within transaction
   * @returns Result from the operation
   */
  private async executeTransaction<T>(
    operation: (todoRepo: TodoRepository, userRepo: UserRepository) => Promise<T>
  ): Promise<T> {
    return this.transactionManager.execute(
      async (queryRunner) => {
        // ===== TRANSACTION START =====
        const todoRepository = new TodoRepository(queryRunner.manager);
        const userRepository = new UserRepository(queryRunner.manager);

        // Execute the operation with transaction context
        const result = await operation(todoRepository, userRepository);

        // ===== TRANSACTION END (auto-commit on success) =====
        return result;
      },
      'SERIALIZABLE'
    );
  }

  /**
   * Get all todos for a user with optional filtering and pagination
   * @param userId - User ID to fetch todos for
   * @param filters - Optional filters for status, priority, and due date
   * @param pagination - Optional pagination parameters (page, limit)
   * @returns Object with todos array and pagination metadata
   */
  async getTodos(
    userId: number,
    filters?: {
      status?: TodoStatus;
      priority?: Priority;
      dueDate?: string;
    },
    pagination?: {
      page: number;
      limit: number;
    }
  ) {
    return this.executeTransaction(async (todoRepo, userRepo) => {
      // Validate user exists
      const user = await userRepo.findById(userId);
      if (!user) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      // Convert filter parameters to proper types
      const processedFilters = {
        status: filters?.status as TodoStatus | undefined,
        priority: filters?.priority as Priority | undefined,
        dueDate: filters?.dueDate ? new Date(filters.dueDate) : undefined,
      };

      // Fetch todos from repository
      const fetchResult = await todoRepo.find(
        userId,
        undefined,
        processedFilters,
        pagination || { page: 1, limit: 10 }
      );

      const { todos, total } = (fetchResult && typeof fetchResult === 'object' && 'todos' in fetchResult)
        ? fetchResult
        : { todos: [], total: 0 };

      return {
        todos,
        pagination: {
          page: pagination?.page || 1,
          limit: pagination?.limit || 10,
          total,
          pages: Math.ceil(total / (pagination?.limit || 10)),
        },
      };
    });
  }

  /**
   * Get a single todo by ID
   * @param todoId - Todo ID to retrieve
   * @param userId - User ID for authorization check
   * @returns Todo object
   */
  async getTodoById(todoId: number, userId: number) {
    return this.executeTransaction(async (todoRepo, userRepo) => {
      // Validate user exists
      const user = await userRepo.findById(userId);
      if (!user) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      // Find todo
      const todo = await todoRepo.find(userId, todoId);
      if (!todo || typeof todo === 'object' && 'todos' in todo) {
        throw new Error(ERROR_MESSAGES.TODO_NOT_FOUND);
      }

      return todo;
    });
  }

  /**
   * Create a new todo for a user
   * @param text - Todo text/description
   * @param userId - User ID who creates the todo
   * @param priority - Optional priority level
   * @param dueDate - Optional due date (ISO format string)
   * @returns Created Todo object
   */
  async createTodo(text: string, userId: number, priority?: Priority, dueDate?: string) {
    if (!text || text.trim().length === 0) {
      throw new Error(ERROR_MESSAGES.TODO_TEXT_REQUIRED);
    }

    return this.executeTransaction(async (todoRepo, userRepo) => {
      // Validate user exists
      const user = await userRepo.findById(userId);
      if (!user) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      // Create todo
      const todo = await todoRepo.create(
        text.trim(),
        userId,
        priority,
        dueDate ? new Date(dueDate) : undefined
      );

      return todo;
    });
  }

  /**
   * Update an existing todo
   * @param todoId - Todo ID to update
   * @param userId - User ID for authorization check
   * @param updates - Object containing fields to update
   * @returns Updated Todo object
   */
  async updateTodo(
    todoId: number,
    userId: number,
    updates: {
      text?: string;
      status?: TodoStatus;
      priority?: Priority;
      dueDate?: string | null;
    }
  ) {
    return this.executeTransaction(async (todoRepo, userRepo) => {
      // Validate user exists
      const user = await userRepo.findById(userId);
      if (!user) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      // Validate todo exists and belongs to user
      const todo = await todoRepo.find(userId, todoId);
      if (!todo || typeof todo === 'object' && 'todos' in todo) {
        throw new Error(ERROR_MESSAGES.TODO_NOT_FOUND);
      }

      // Build update data
      const updateData: Record<string, any> = {};
      if (updates.text !== undefined) {
        updateData.text = updates.text.trim();
      }
      if (updates.status !== undefined) {
        updateData.status = updates.status;
      }
      if (updates.priority !== undefined) {
        updateData.priority = updates.priority;
      }
      if (updates.dueDate !== undefined) {
        updateData.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
      }

      // Update todo
      const updatedTodo = await todoRepo.update(todoId, userId, updateData);
      if (!updatedTodo) {
        throw new Error(ERROR_MESSAGES.UPDATE_TODO_FAILED);
      }

      return updatedTodo;
    });
  }

  /**
   * Delete a todo (soft delete by marking as DELETED)
   * @param todoId - Todo ID to delete
   * @param userId - User ID for authorization check
   */
  async deleteTodo(todoId: number, userId: number) {
    return this.executeTransaction(async (todoRepo, userRepo) => {
      // Validate user exists
      const user = await userRepo.findById(userId);
      if (!user) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      // Validate todo exists and belongs to user
      const todo = await todoRepo.find(userId, todoId);
      if (!todo || typeof todo === 'object' && 'todos' in todo) {
        throw new Error(ERROR_MESSAGES.TODO_NOT_FOUND);
      }

      // Delete todo
      const deleted = await todoRepo.delete(todoId);
      if (!deleted) {
        throw new Error(ERROR_MESSAGES.DELETE_TODO_FAILED);
      }

      return true;
    });
  }
}
