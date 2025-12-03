// Import reflect-metadata for TypeORM decorators to work
import 'reflect-metadata';
// Import TypeORM DataSource class for database connection configuration
import { DataSource } from 'typeorm';
// Import User entity
import { User } from '../entities/User.ts';
// Import Todo entity
import { Todo } from '../entities/Todo.ts';

// ========== DATABASE CONNECTION CONFIGURATION ==========
/**
 * AppDataSource is the main database connection instance
 * It configures TypeORM to connect to a PostgreSQL database
 * with User and Todo entities
 */
export const AppDataSource = new DataSource({
  // Database type - using PostgreSQL
  type: 'postgres',
  // Database host from environment variable or localhost
  host: process.env.DB_HOST || 'localhost',
  // Database port from environment variable or default PostgreSQL port 5432
  port: parseInt(process.env.DB_PORT || '5432'),
  // Database username from environment variable or default
  username: process.env.DB_USER || 'postgres',
  // Database password from environment variable or default
  password: process.env.DB_PASSWORD || 'postgres',
  // Database name from environment variable or default
  database: process.env.DB_NAME || 'todo_db',
  // Enable automatic schema synchronization in development
  // Set to false in production to use migrations instead
  synchronize: process.env.NODE_ENV !== 'production',
  // Disable SQL query logging (set to true for debugging)
  logging: true,
  // List of entities to be used in the application
  entities: [User, Todo],
  // Path to migration files
  migrations: ['src/migrations/*.ts'],
  // Subscribers for lifecycle events (currently empty)
  subscribers: [],
});
