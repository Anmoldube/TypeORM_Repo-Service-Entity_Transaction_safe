// Import TypeORM DataSource for database connection
import { DataSource } from 'typeorm';
// Import UserRepository for database operations
import { UserRepository } from '../repositories/UserRepository.ts';
// Import auth utility functions for password hashing and JWT generation
import { hashPassword, verifyPassword, generateToken } from '../middleware/auth.ts';
// Import error message constants
import { ERROR_MESSAGES } from '../utils/constants.ts';
// Import TransactionManager for transaction handling
import { TransactionManager } from '../utils/TransactionManager.ts';

// ========== USER SERVICE ==========
/**
 * UserService handles business logic for user operations
 * Acts as intermediary between controllers and repositories
 * Manages registration, login, and user retrieval
 */
export class UserService {
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
   * CORE TRANSACTION FUNCTION - All user operations use this
   * Executes a transaction block with SERIALIZABLE isolation
   * Automatically handles database context
   * @param operation - The operation to perform within transaction
   * @returns Result from the operation
   */
  private async executeTransaction<T>(
    operation: (userRepo: UserRepository) => Promise<T>
  ): Promise<T> {
    return this.transactionManager.execute(
      async (queryRunner) => {
        // ===== TRANSACTION START =====
        const userRepository = new UserRepository(queryRunner.manager);

        // Execute the operation with transaction context
        const result = await operation(userRepository);

        // ===== TRANSACTION END (auto-commit on success) =====
        return result;
      },
      'SERIALIZABLE'
    );
  }

  /**
   * Register a new user account
   * Validates input, checks for existing user, hashes password, and returns JWT token
   * Uses SERIALIZABLE isolation to prevent race conditions
   * @param email - User's email address
   * @param password - User's plaintext password
   * @param name - Optional user display name
   * @returns Object containing user data and JWT token
   */
  async register(email: string, password: string, name?: string) {
    if (!email || !password) {
      throw new Error(ERROR_MESSAGES.EMAIL_PASSWORD_REQUIRED);
    }

    const result = await this.executeTransaction(async (userRepo) => {
      // Check if user with this email already exists
      const userExists = await userRepo.exists(email);
      if (userExists) {
        throw new Error(ERROR_MESSAGES.USER_EXISTS);
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const user = await userRepo.create(email, hashedPassword, name);

      return user;
    });

    // Generate JWT token for the new user
    const token = generateToken({
      id: result.id!,
      email: result.email!,
      name: result.name || undefined,
    });

    // Return user data and token (without password for security)
    return {
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
      },
      token,
    };
  }

  /**
   * Login user with email and password
   * Validates credentials and returns JWT token
   * Uses SERIALIZABLE isolation for consistency
   * @param email - User's email address
   * @param password - User's plaintext password
   * @returns Object containing user data and JWT token
   */
  async login(email: string, password: string) {
    if (!email || !password) {
      throw new Error(ERROR_MESSAGES.EMAIL_PASSWORD_REQUIRED);
    }

    const user = await this.executeTransaction(async (userRepo) => {
      // Find user by email in database
      const foundUser = await userRepo.findByEmail(email);
      if (!foundUser) {
        throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
      }

      // Compare provided password with stored bcrypt hash
      const isValidPassword = await verifyPassword(password, foundUser.password!);
      if (!isValidPassword) {
        throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
      }

      return foundUser;
    });

    // Generate JWT token for authenticated user
    const token = generateToken({
      id: user.id!,
      email: user.email!,
      name: user.name || undefined,
    });

    // Return user data and token (without password for security)
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    };
  }

  /**
   * Get user profile information by ID
   * Uses SERIALIZABLE isolation for consistency
   * @param id - User ID to retrieve
   * @returns User object with id, email, and name
   */
  async getUserById(id: number) {
    return this.executeTransaction(async (userRepo) => {
      // Find user in database by ID
      const user = await userRepo.findById(id);
      if (!user) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      // Return user data (without password)
      return {
        id: user.id,
        email: user.email,
        name: user.name,
      };
    });
  }
}
