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
  // UserRepository instance for database operations
  private userRepository: UserRepository;
  // TransactionManager for managing dependent transactions
  private transactionManager: TransactionManager;

  /**
   * Constructor initializes the service with UserRepository
   * @param dataSource - TypeORM DataSource for database connection
   */
  constructor(dataSource: DataSource) {
    this.userRepository = new UserRepository(dataSource);
    this.transactionManager = new TransactionManager(dataSource);
  }

  /**
   * Register a new user account
   * Validates input, checks for existing user, hashes password, and returns JWT token
   * All operations are wrapped in a DEPENDENT transaction for data consistency
   * Uses SERIALIZABLE isolation to prevent race conditions (e.g., duplicate email registration)
   * @param email - User's email address
   * @param password - User's plaintext password
   * @param name - Optional user display name
   * @returns Object containing user data and JWT token
   * @throws Error if email/password missing, user exists, or registration fails
   */
  async register(email: string, password: string, name?: string) {
    // Validate that email and password are provided
    if (!email || !password) {
      throw new Error(ERROR_MESSAGES.EMAIL_PASSWORD_REQUIRED);
    }

    // Wrap entire registration in dependent transactions with SERIALIZABLE isolation
    // This prevents race conditions where two clients register the same email simultaneously
    const results = await this.transactionManager.executeDependent<any>(
      [
        // Step 1: Check if user with this email already exists
        async (queryRunner) => {
          const userRepository = new UserRepository(queryRunner.manager);
          const userExists = await userRepository.exists(email);
          if (userExists) {
            throw new Error(ERROR_MESSAGES.USER_EXISTS);
          }
          return null;
        },
        // Step 2: Hash password (only if email check passed in Step 1)
        async (queryRunner) => {
          const hashedPassword = await hashPassword(password);
          return hashedPassword;
        },
        // Step 3: Create user (only if all previous validations passed)
        async (queryRunner) => {
          const userRepository = new UserRepository(queryRunner.manager);
          const hashedPassword = results[1];
          const user = await userRepository.create(email, hashedPassword, name);
          return user;
        },
      ],
      'SERIALIZABLE' // Highest isolation level - prevents duplicate registrations
    );

    const user = results[2];

    // Generate JWT token for the new user
    const token = generateToken({
      id: user.id,
      email: user.email,
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
   * Login user with email and password
   * Validates credentials and returns JWT token
   * @param email - User's email address
   * @param password - User's plaintext password
   * @returns Object containing user data and JWT token
   * @throws Error if credentials are invalid or missing
   */
  async login(email: string, password: string) {
    // Validate that email and password are provided
    if (!email || !password) {
      throw new Error(ERROR_MESSAGES.EMAIL_PASSWORD_REQUIRED);
    }

    // Find user by email in database
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    // Compare provided password with stored bcrypt hash
    const isValidPassword = await verifyPassword(password, user.password!);
    if (!isValidPassword) {
      throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    // Generate JWT token for authenticated user
    const token = generateToken({
      id: user.id,
      email: user.email,
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
   * @param id - User ID to retrieve
   * @returns User object with id, email, and name
   * @throws Error if user not found
   */
  async getUserById(id: number) {
    // Find user in database by ID
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Return user data (without password)
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }
}
