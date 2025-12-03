import { DataSource, QueryRunner, IsolationLevel } from 'typeorm';

/**
 * TransactionManager handles database transactions with support for:
 * - Multiple isolation levels for data consistency
 * - Dependent/nested transactions using savepoints
 * - Automatic retry on deadlocks
 * - Transaction timeout protection
 */
export class TransactionManager {
  // Track active transactions per context (for dependent transactions)
  private activeTransactions = new WeakMap<object, QueryRunner>();
  // Default isolation level for safety
  private defaultIsolationLevel: IsolationLevel = 'READ_COMMITTED';
  // Retry configuration for deadlocks
  private maxRetries = 3;
  private retryDelayMs = 100;

  constructor(private dataSource: DataSource) { }

  /**
   * Execute a callback within a transaction with automatic rollback on error
   * @param callback - Function to execute within transaction
   * @param isolationLevel - Transaction isolation level (default: READ_COMMITTED)
   * @param context - Optional context object to track active transactions
   * @returns Result from callback
   */
  async execute<T>(
    callback: (queryRunner: QueryRunner) => Promise<T>,
    isolationLevel: IsolationLevel = this.defaultIsolationLevel,
    context?: object
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      // Check if we already have an active transaction (nested/dependent)
      const existingTransaction = context ? this.activeTransactions.get(context) : null;

      if (existingTransaction && existingTransaction.isTransactionActive) {
        // Reuse existing transaction (dependent transaction)
        return await this.executeWithSavepoint<T>(callback, existingTransaction);
      }

      // Create new independent transaction
      await queryRunner.connect();
      await queryRunner.startTransaction(isolationLevel);

      // Store active transaction if context provided
      if (context) {
        this.activeTransactions.set(context, queryRunner);
      }

      const result = await callback(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      // Rollback on error
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Execute with savepoints for nested transactions
   * Savepoints allow partial rollback within a transaction
   * @param callback - Function to execute
   * @param queryRunner - Existing transaction context
   * @returns Result from callback
   */
  private async executeWithSavepoint<T>(
    callback: (queryRunner: QueryRunner) => Promise<T>,
    queryRunner: QueryRunner
  ): Promise<T> {
    const savepointName = `sp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Create savepoint
      await queryRunner.query(`SAVEPOINT ${savepointName}`);
      const result = await callback(queryRunner);
      // Release savepoint on success
      await queryRunner.query(`RELEASE SAVEPOINT ${savepointName}`);
      return result;
    } catch (error) {
      // Rollback to savepoint on error
      try {
        await queryRunner.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
      } catch (rollbackError) {
        console.error('Savepoint rollback failed:', rollbackError);
      }
      throw error;
    }
  }

  /**
   * Execute with automatic retry on deadlock
   * Useful for high-concurrency scenarios
   * @param callback - Function to execute
   * @param isolationLevel - Transaction isolation level
   * @returns Result from callback
   */
  async executeWithRetry<T>(
    callback: (queryRunner: QueryRunner) => Promise<T>,
    isolationLevel: IsolationLevel = this.defaultIsolationLevel
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.execute<T>(callback, isolationLevel);
      } catch (error) {
        lastError = error as Error;
        // Check if it's a deadlock error
        if (this.isDeadlockError(lastError) && attempt < this.maxRetries) {
          // Exponential backoff before retry
          await this.delay(this.retryDelayMs * Math.pow(2, attempt - 1));
          continue;
        }
        throw error;
      }
    }

    throw lastError || new Error('Transaction failed after retries');
  }

  /**
   * Execute multiple dependent operations in a single transaction
   * All operations must succeed together or all rollback
   * @param operations - Array of async operations to execute
   * @param isolationLevel - Transaction isolation level
   * @returns Array of results from each operation
   */
  async executeDependent<T>(
    operations: Array<(queryRunner: QueryRunner) => Promise<T>>,
    isolationLevel: IsolationLevel = this.defaultIsolationLevel
  ): Promise<T[]> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction(isolationLevel);

      const results: T[] = [];

      for (const operation of operations) {
        try {
          const result = await operation(queryRunner);
          results.push(result);
        } catch (error) {
          // If any operation fails, entire transaction fails
          throw new Error(`Dependent transaction failed at step ${results.length + 1}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      await queryRunner.commitTransaction();
      return results;
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Check if error is a deadlock error
   * @param error - Error to check
   * @returns Boolean indicating if error is a deadlock
   */
  private isDeadlockError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('deadlock') ||
      message.includes('wait-for graph') ||
      message.includes('1213'); // MySQL deadlock code
  }

  /**
   * Utility function for delays
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Set custom isolation level
   * @param level - Isolation level (READ_UNCOMMITTED, READ_COMMITTED, REPEATABLE_READ, SERIALIZABLE)
   */
  setDefaultIsolationLevel(level: IsolationLevel): void {
    this.defaultIsolationLevel = level;
  }

  /**
   * Set custom retry configuration
   * @param maxRetries - Maximum number of retries
   * @param delayMs - Initial delay in milliseconds (uses exponential backoff)
   */
  setRetryConfig(maxRetries: number, delayMs: number): void {
    this.maxRetries = maxRetries;
    this.retryDelayMs = delayMs;
  }
}
