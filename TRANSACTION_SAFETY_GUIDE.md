# Transaction Safety & Dependency Guide

## Problem Analysis: Why Your Original Transactions Weren't Safe

### 1. **No Isolation Levels**
Your original `TransactionManager.execute()` didn't specify database isolation levels, leaving transactions vulnerable to:
- **Dirty Reads**: Reading uncommitted changes from other transactions
- **Non-Repeatable Reads**: Reading the same row twice and getting different values
- **Phantom Reads**: Query results changing mid-transaction

### 2. **No Transaction Dependencies**
Each service method created an independent transaction:
```typescript
// UNSAFE: Two separate transactions
await validateUser(userId);      // Transaction 1 - User validated
await todoRepository.create(...); // Transaction 2 - What if user deleted between these?
```

**Race Condition Example:**
```
Thread A: Validates user exists ✓
Thread B: Deletes the user ✓
Thread A: Creates todo for deleted user ✗
```

### 3. **No Savepoints for Nested Operations**
If multiple database operations need to fail together, there was no mechanism.

### 4. **No Deadlock Retry Logic**
High-concurrency scenarios could hit deadlocks with no recovery mechanism.

---

## Solutions Implemented

### 1. **Enhanced TransactionManager with Isolation Levels**

#### Isolation Levels (from least to most restrictive):

| Level              | Risk                     | Performance | Use Case             |
| ------------------ | ------------------------ | ----------- | -------------------- |
| `READ_UNCOMMITTED` | High (dirty reads)       | Fastest     | Not recommended      |
| `READ_COMMITTED`   | Medium (phantom reads)   | Good        | Default, general use |
| `REPEATABLE_READ`  | Low (phantom reads only) | Medium      | Financial operations |
| `SERIALIZABLE`     | None (fully isolated)    | Slower      | Critical operations  |

#### Example: Using Isolation Levels
```typescript
// Use for general read operations (default)
await transactionManager.execute(callback, 'READ_COMMITTED');

// Use for critical writes like registration (prevents duplicates)
await transactionManager.execute(callback, 'SERIALIZABLE');

// Use for financial operations
await transactionManager.execute(callback, 'REPEATABLE_READ');
```

### 2. **Dependent Transactions with `executeDependent()`**

This new method ensures all operations happen in ONE transaction or NONE happen:

```typescript
async createTodo(text: string, userId: number) {
  // All steps execute in ONE transaction with SERIALIZABLE isolation
  const results = await this.transactionManager.executeDependent(
    [
      // Step 1: Validate user
      async (queryRunner) => {
        const user = await userRepository.findById(userId);
        if (!user) throw new Error('User not found');
        return user;
      },
      // Step 2: Create todo (only runs if Step 1 succeeds)
      async (queryRunner) => {
        const todo = await todoRepository.create(text, userId);
        return todo;
      },
    ],
    'SERIALIZABLE'
  );
  
  return results[1]; // Return created todo
}
```

**Why This Is Safe:**
- ✅ Both operations in same transaction
- ✅ Database locks are held throughout
- ✅ If Step 1 fails → Step 2 never runs
- ✅ If Step 2 fails → Step 1 is rolled back

### 3. **Savepoints for Nested Transactions**

For complex operations with intermediate rollback points:

```typescript
// If you need nested transactions within a transaction
const result = await transactionManager.execute(async (queryRunner) => {
  // Main operation
  
  // If you call execute() again, it uses SAVEPOINT instead of a new transaction
  const nestedResult = await this.executeWithSavepoint(callback, queryRunner);
  
  return result;
});
```

Savepoints allow:
- Partial rollback within a transaction
- No performance overhead
- All-or-nothing guarantee at commit time

### 4. **Automatic Deadlock Retry**

For high-concurrency scenarios:

```typescript
// Automatically retries up to 3 times on deadlock
// Uses exponential backoff (100ms, 200ms, 400ms)
await transactionManager.executeWithRetry(
  callback,
  'READ_COMMITTED'
);
```

---

## Updated Service Methods

### Before (Unsafe):
```typescript
async createTodo(text: string, userId: number) {
  return await this.transactionManager.execute(async (queryRunner) => {
    // User validation in Transaction 1
    const user = await userRepository.findById(userId);
    
    // Todo creation in Transaction 2 (separate from user check!)
    const todo = await todoRepository.create(text, userId);
    return todo;
  });
  // Problem: What if user is deleted between these operations?
}
```

### After (Safe):
```typescript
async createTodo(text: string, userId: number) {
  const results = await this.transactionManager.executeDependent(
    [
      async (queryRunner) => {
        // Step 1: Validate
        const user = await userRepository.findById(userId);
        if (!user) throw new Error('User not found');
        return user;
      },
      async (queryRunner) => {
        // Step 2: Create (only runs if Step 1 passes)
        const todo = await todoRepository.create(text, userId);
        return todo;
      },
    ],
    'SERIALIZABLE' // Prevent all anomalies
  );
  return results[1];
}
```

---

## Key Improvements in Your Code

### 1. **TodoService.createTodo()**
- ✅ Uses `executeDependent()` with SERIALIZABLE isolation
- ✅ Validates user and creates todo in same transaction
- ✅ Cannot create todo for deleted users

### 2. **TodoService.updateTodo()**
- ✅ Validates authorization and todo existence in Step 1
- ✅ Performs update in Step 2 (only if Step 1 passes)
- ✅ Prevents race conditions with concurrent deletes

### 3. **TodoService.deleteTodo()**
- ✅ Validates authorization before soft-deleting
- ✅ Cannot delete todo that was already deleted

### 4. **UserService.register()**
- ✅ Email existence check and user creation in same transaction
- ✅ SERIALIZABLE isolation prevents duplicate registrations
- ✅ Two clients can't register same email simultaneously

---

## Configuration Options

### Set Custom Isolation Level Globally
```typescript
const transactionManager = new TransactionManager(dataSource);
transactionManager.setDefaultIsolationLevel('REPEATABLE_READ');
```

### Configure Retry Behavior
```typescript
// Max 5 retries, 50ms initial delay
transactionManager.setRetryConfig(5, 50);
```

---

## Isolation Level Decision Guide

### Use SERIALIZABLE for:
- ✅ User registration (prevent duplicates)
- ✅ Critical financial operations
- ✅ Any write that depends on read validation
- ✅ Operations checking unique constraints

### Use REPEATABLE_READ for:
- ✅ Inventory management
- ✅ Operations requiring consistent reads
- ✅ Multi-step business logic with reads

### Use READ_COMMITTED for:
- ✅ Simple reads
- ✅ Bulk inserts
- ✅ General CRUD operations
- ✅ When phantom reads are acceptable

### Use READ_UNCOMMITTED for:
- ⚠️ Rarely recommended
- ⚠️ Only for reporting/analytics where accuracy isn't critical

---

## Testing Transaction Safety

### Deadlock Testing
```bash
# Run multiple concurrent requests
for i in {1..10}; do
  curl -X POST http://localhost:3000/todos -d '{"text":"test"}' &
done
wait
```

### Race Condition Testing
```bash
# Test duplicate registration
curl -X POST http://localhost:3000/register -d '{"email":"test@example.com","password":"pass"}' &
curl -X POST http://localhost:3000/register -d '{"email":"test@example.com","password":"pass"}' &
wait
```

---

## Performance Considerations

### Isolation Level vs Performance Tradeoff

```
SERIALIZABLE  ←→  Slowest, Most Safe
REPEATABLE_READ
READ_COMMITTED   ←→  Fastest, Less Safe
READ_UNCOMMITTED
```

**Rule of Thumb:**
- Use the lowest isolation level that meets your requirements
- For user-facing features: SERIALIZABLE for registration/deletion
- For todos/general CRUD: READ_COMMITTED is fine
- For bulk operations: Consider batch processing

### Monitoring

Check for deadlocks in your database:
```sql
-- PostgreSQL
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- MySQL
SHOW PROCESSLIST;
```

---

## Summary of Improvements

| Issue                | Before           | After                               |
| -------------------- | ---------------- | ----------------------------------- |
| Isolation            | None specified   | Configurable per operation          |
| Dependencies         | Independent      | Dependent with `executeDependent()` |
| Race Conditions      | Possible         | Prevented with SERIALIZABLE         |
| Nested Transactions  | Not supported    | Supported via savepoints            |
| Deadlocks            | No recovery      | Auto-retry with backoff             |
| Transaction Size     | Unbounded        | Clear step boundaries               |
| Rollback Granularity | Entire operation | Per step with savepoints            |

---

## Next Steps

1. **Test the new implementation** with concurrent requests
2. **Monitor database logs** for deadlocks
3. **Adjust isolation levels** based on performance metrics
4. **Consider adding indexes** for faster validation queries
5. **Add integration tests** for transaction failure scenarios

