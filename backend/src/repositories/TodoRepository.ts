// Import TypeORM Repository and query operators
import { Repository, Not, DataSource, EntityManager } from 'typeorm';
// Import Todo entity and its enums
import { Todo, TodoStatus, Priority } from '../entities/Todo.ts';

// ========== TODO REPOSITORY ==========
/**
 * TodoRepository handles all database operations for Todo entity
 * Uses TypeORM QueryBuilder for complex filtering and pagination
 * Implements soft delete by marking status as DELETED instead of removing records
 */
export const getTodoRepository = (dataSourceOrManager: DataSource | EntityManager): Repository<Todo> => {
  return dataSourceOrManager.getRepository(Todo);
};

export class TodoRepository {
  // TypeORM repository instance for Todo entity
  private repo: Repository<Todo>;

  /**
   * Constructor initializes the repository with Todo entity
   * @param dataSource - TypeORM DataSource or EntityManager for database connection
   */
  constructor(dataSource: DataSource | EntityManager) {
    this.repo = getTodoRepository(dataSource);
  }

  /**
   * Creates a base query builder that excludes soft-deleted todos
   * Used by multiple methods to avoid repetition of deletion filter
   * @returns QueryBuilder with soft-delete filter applied
   */
  private createBaseQuery() {
    return this.repo.createQueryBuilder('todo')
      .andWhere('todo.status != :deletedStatus', { deletedStatus: TodoStatus.DELETED });
  }

  /**
   * Add authorization filter to query (id and authorId)
   * Centralizes the security check logic for todo ownership
   * @param query - QueryBuilder instance to apply filters to
   * @param id - Todo ID to filter by
   * @param authorId - Author ID to filter by
   */
  private applyAuthFilter(query: any, id: number, authorId: number): void {
    query.andWhere('todo.id = :id', { id })
      .andWhere('todo.authorId = :authorId', { authorId });
  }

  /**
   * Unified find function for todos
   * Handles both single todo lookup (by id + authorId) and bulk lookup (by authorId with filtering)
   * Excludes soft deleted todos
   * Single function replaces find() and findByAuthor()
   * 
   * @param authorId - Author ID (required for authorization check)
   * @param id - Optional Todo ID for single todo lookup
   * @param filters - Optional filters for status, priority, and due date (for bulk lookup)
   * @param pagination - Optional pagination with page and limit (for bulk lookup)
   * @returns Single Todo or object with todos array and total count, null if not found
   */
  async find(
    authorId: number,
    id?: number,
    filters?: {
      status?: TodoStatus;
      priority?: Priority;
      dueDate?: Date;
    },
    pagination?: {
      page: number;
      limit: number;
    }
  ): Promise<Todo | null | { todos: Todo[]; total: number }> {
    // Create base query that excludes deleted todos
    const query = this.createBaseQuery()
      .andWhere('todo.authorId = :authorId', { authorId });

    // Case 1: Single todo lookup by ID
    if (id !== undefined) {
      query.andWhere('todo.id = :id', { id });
      return query.getOne();
    }

    // Case 2: Bulk todos lookup for author with optional filtering
    this.applyFilters(query, filters);
    query.orderBy('todo.createdAt', 'DESC');

    if (pagination) {
      this.applyPagination(query, pagination);
    }

    const [todos, total] = await query.getManyAndCount();
    return { todos, total };
  }

  /**
   * Apply optional filters to a query builder
   * @param query - QueryBuilder instance to apply filters to
   * @param filters - Filters to apply
   */
  private applyFilters(query: any, filters?: {
    status?: TodoStatus;
    priority?: Priority;
    dueDate?: Date;
  }): void {
    // Add status filter if provided
    if (filters?.status) {
      query.andWhere('todo.status = :status', { status: filters.status });
    }

    // Add priority filter if provided
    if (filters?.priority) {
      query.andWhere('todo.priority = :priority', { priority: filters.priority });
    }

    // Add due date filter if provided (todos with due date on or before the given date)
    if (filters?.dueDate) {
      query.andWhere('todo.dueDate <= :dueDate', { dueDate: filters.dueDate });
    }
  }

  /**
   * Apply pagination to a query builder
   * @param query - QueryBuilder instance to apply pagination to
   * @param pagination - Pagination parameters
   */
  private applyPagination(query: any, pagination: { page: number; limit: number }): void {
    // Calculate how many records to skip based on page number
    const skip = (pagination.page - 1) * pagination.limit;
    // Skip records and take only the limit amount
    query.skip(skip).take(pagination.limit);
  }

  /**
   * Create a new todo in the database
   * @param text - Todo description/text
   * @param authorId - User ID who created the todo
   * @param priority - Optional priority level (defaults to MEDIUM)
   * @param dueDate - Optional due date
   * @returns Created Todo object
   */
  async create(
    text: string,
    authorId: number,
    priority?: Priority,
    dueDate?: Date | null
  ): Promise<Todo> {
    // Create new Todo instance with provided data
    const todo = this.repo.create({
      text,
      authorId,
      // Use MEDIUM priority as default if not provided
      priority: priority || Priority.MEDIUM,
      // Set dueDate to null if not provided
      dueDate: dueDate || null,
    });
    // Save todo to database and return the saved instance
    return this.repo.save(todo);
  }

  /**
   * Update an existing todo
   * Depends on: find() for fetching updated result
   * @param id - Todo ID to update
   * @param authorId - Author ID for authorization check
   * @param data - Partial todo data to update
   * @returns Updated Todo object or null if not found
   */
  async update(id: number, authorId: number, data: Partial<Todo>): Promise<Todo | null> {
    // Update todo in database with provided data
    const result = await this.repo.update(id, data);

    // Only fetch if update was successful
    if ((result.affected || 0) <= 0) {
      return null;
    }

    // Return the updated todo by fetching it once (single todo lookup)
    const todo = await this.find(authorId, id);
    return (todo && typeof todo === 'object' && 'id' in todo) ? (todo as Todo) : null;
  }

  /**
   * Soft delete a todo by marking its status as DELETED
   * Records are not actually removed from database
   * @param id - Todo ID to delete
   * @returns Boolean indicating if deletion was successful
   */
  async delete(id: number): Promise<boolean> {
    // Update todo status to DELETED instead of removing the record
    const result = await this.repo.update(id, { status: TodoStatus.DELETED });
    // Return true if at least one row was affected
    return (result.affected || 0) > 0;
  }

  /**
   * Check if todo exists for a given author
   * Excludes deleted todos
   * @param id - Todo ID to check
   * @param authorId - Author ID for authorization check
   * @returns Boolean indicating if todo exists
   */
  async exists(id: number, authorId: number): Promise<boolean> {
    const query = this.createBaseQuery();
    this.applyAuthFilter(query, id, authorId);
    const count = await query.getCount();
    return count > 0;
  }
}
