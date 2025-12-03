// Import TypeORM Repository class and DataSource
import { Repository, DataSource, EntityManager } from 'typeorm';
// Import User entity
import { User } from '../entities/User.ts';

// ========== USER REPOSITORY ==========
/**
 * UserRepository handles all database operations for User entity
 * Provides methods for CRUD operations (Create, Read, Update, Delete)
 * Abstracts database logic from service layer
 */
export const getUserRepository = (dataSourceOrManager: DataSource | EntityManager): Repository<User> => {
  if (dataSourceOrManager instanceof DataSource) {
    return dataSourceOrManager.getRepository(User);
  }
  return dataSourceOrManager.getRepository(User);
};

export class UserRepository {
  // TypeORM repository instance for User entity
  private repo: Repository<User>;

  /**
   * Constructor initializes the repository with User entity
   * @param dataSource - TypeORM DataSource or EntityManager for database connection
   */
  constructor(dataSource: DataSource | EntityManager) {
    this.repo = getUserRepository(dataSource);
  }

  /**
   * Find a user by ID
   * @param id - User ID to search for
   * @returns User object if found, null otherwise
   */
  async findById(id: number): Promise<User | null> {
    return this.repo.findOne({
      where: { id },
    });
  }

  /**
   * Find a user by email address
   * @param email - Email to search for
   * @returns User object if found, null otherwise
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({
      where: { email },
    });
  }

  /**
   * Create a new user in the database
   * @param email - User's email address
   * @param hashedPassword - Bcrypt hashed password
   * @param name - Optional user display name
   * @returns Created User object
   */
  async create(email: string, hashedPassword: string, name?: string): Promise<User> {
    // Create new User instance with provided data
    const user = this.repo.create({
      email,
      password: hashedPassword,
      name: name || null,
    });
    // Save user to database and return the saved instance
    return this.repo.save(user);
  }

  /**
   * Update an existing user
   * Depends on: findById() for fetching updated result
   * @param id - User ID to update
   * @param data - Partial user data to update
   * @returns Updated User object or null if user not found
   */
  async update(id: number, data: Partial<User>): Promise<User | null> {
    // Update user in database with provided data
    const result = await this.repo.update(id, data);

    // Only fetch if update was successful
    if ((result.affected || 0) <= 0) {
      return null;
    }

    // Return the updated user by fetching it once
    return this.findById(id);
  }

  /**
   * Delete a user from database
   * @param id - User ID to delete
   * @returns Boolean indicating if deletion was successful
   */
  async delete(id: number): Promise<boolean> {
    // Execute delete query and get the result
    const result = await this.repo.delete(id);
    // Return true if at least one row was affected
    return (result.affected || 0) > 0;
  }

  /**
   * Check if user with given email already exists
   * @param email - Email to check
   * @returns Boolean indicating if user exists
   */
  async exists(email: string): Promise<boolean> {
    // Count users with the given email
    const count = await this.repo.count({
      where: { email },
    });
    // Return true if count is greater than 0
    return count > 0;
  }
}
