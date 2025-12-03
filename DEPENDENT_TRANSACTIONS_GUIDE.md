# Dependent Transactions in Todo App

## What Are Dependent Transactions?

Dependent transactions are **multiple operations that must succeed together or fail together**. If any operation fails, ALL operations are rolled back automatically.

---

## How It Works in Your Todo App

### The Pattern

```typescript
// Multiple operations that depend on each other
const results = await this.transactionManager.executeDependent<any>(
  [
    // Step 1: Validate user exists (no dependencies)
    async (queryRunner) => { ... },
    
    // Step 2: Fetch/Create/Update todo (depends on Step 1)
    async (queryRunner) => { ... },
  ],
  'SERIALIZABLE' // Isolation level
);
```

**Key Point:** Step 2 ONLY runs if Step 1 succeeds. If Step 1 throws an error, Step 2 never runs and transaction is rolled back.

---

## Real Examples from Your Code

### Example 1: Create Todo (Dependent on User Validation)

**File:** `TodoService.ts` - `createTodo()` method

```typescript
async createTodo(text: string, userId: number, priority?: Priority, dueDate?: string) {
  const results = await this.transactionManager.executeDependent<any>(
    [
      // STEP 1: Validate user exists
      async (queryRunner) => {
        const userRepository = new UserRepository(queryRunner.manager);
        const user = await userRepository.findById(userId);
        if (!user) {
          throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
        }
        return user; // ← Result stored in results[0]
      },
      
      // STEP 2: Create todo (DEPENDS ON STEP 1)
      // Only runs if user exists from Step 1
      async (queryRunner) => {
        const todoRepository = new TodoRepository(queryRunner.manager);
        const todo = await todoRepository.create(
          text.trim(),
          userId,
          priority,
          dueDate ? new Date(dueDate) : undefined
        );
        return todo; // ← Result stored in results[1]
      },
    ],
    'SERIALIZABLE' // Prevents race conditions
  );

  return results[1]; // Return created todo
}
```

**Dependency Chain:**
```
Step 1: User exists?
   ✓ YES → Proceed to Step 2
   ✗ NO  → Throw error, rollback everything

Step 2: Create todo
   ✓ SUCCESS → Commit entire transaction
   ✗ FAILURE → Rollback everything
```

---

### Example 2: Update Todo (Dependent on Multiple Validations)

**File:** `TodoService.ts` - `updateTodo()` method

```typescript
async updateTodo(todoId: number, userId: number, updates: {...}) {
  const results = await this.transactionManager.executeDependent<any>(
    [
      // STEP 1: Validate user + todo exist
      async (queryRunner) => {
        const userRepository = new UserRepository(queryRunner.manager);
        const todoRepository = new TodoRepository(queryRunner.manager);

        // Check user exists
        const user = await userRepository.findById(userId);
        if (!user) {
          throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        // Check todo exists AND belongs to user
        const todo = await todoRepository.find(userId, todoId);
        if (!todo || typeof todo === 'object' && 'todos' in todo) {
          throw new Error(ERROR_MESSAGES.TODO_NOT_FOUND);
        }

        return { user, todo };
      },
      
      // STEP 2: Update todo (DEPENDS ON STEP 1)
      // Only runs if both user and todo validation passed
      async (queryRunner) => {
        const todoRepository = new TodoRepository(queryRunner.manager);

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

        const updatedTodo = await todoRepository.update(todoId, userId, updateData);
        if (!updatedTodo) {
          throw new Error(ERROR_MESSAGES.UPDATE_TODO_FAILED);
        }

        return updatedTodo;
      },
    ],
    'SERIALIZABLE'
  );

  return results[1]; // Return updated todo
}
```

**Dependency Chain:**
```
Step 1: User exists? AND Todo exists? AND Todo belongs to user?
   ✓ ALL YES → Proceed to Step 2
   ✗ ANY NO  → Throw error, rollback everything

Step 2: Update todo
   ✓ SUCCESS → Commit entire transaction
   ✗ FAILURE → Rollback everything
```

---

### Example 3: Delete Todo (Same Pattern)

**File:** `TodoService.ts` - `deleteTodo()` method

```typescript
async deleteTodo(todoId: number, userId: number) {
  await this.transactionManager.executeDependent<any>(
    [
      // STEP 1: Validate user + todo exist
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
      
      // STEP 2: Delete todo (DEPENDS ON STEP 1)
      async (queryRunner) => {
        const todoRepository = new TodoRepository(queryRunner.manager);

        const deleted = await todoRepository.delete(todoId);
        if (!deleted) {
          throw new Error(ERROR_MESSAGES.DELETE_TODO_FAILED);
        }

        return deleted;
      },
    ],
    'SERIALIZABLE'
  );

  return true;
}
```

---

## Why This Matters - Race Condition Prevention

### Without Dependent Transactions (UNSAFE):

```
Client A: Check if user exists ✓
Client B: Check if user exists ✓
Client A: Create todo for user ✓
Client B: Delete user ✓
Client A: User deleted but todo still belongs to deleted user ✗ (DATA CORRUPTION)
```

### With Dependent Transactions (SAFE):

```
Client A: START TRANSACTION (SERIALIZABLE)
          Check user exists ✓
          Create todo ✓
          COMMIT ✓
          
Client B: START TRANSACTION (SERIALIZABLE)
          Must WAIT for Client A's transaction to finish
          Check user exists ✓
          Delete user ✓
          COMMIT ✓
          
Result: No race condition, data is consistent
```

---

## Key Components in Your Code

### 1. TransactionManager (`utils/TransactionManager.ts`)

```typescript
async executeDependent<T>(
  operations: Array<(queryRunner: QueryRunner) => Promise<T>>,
  isolationLevel: IsolationLevel = this.defaultIsolationLevel
): Promise<T[]>
```

**What it does:**
- Creates ONE database transaction
- Runs operations sequentially within that transaction
- If any operation fails, rolls back entire transaction
- All or nothing guarantee

### 2. Services Using Dependent Transactions

**TodoService.ts:**
- `getTodos()` - Step 1: Validate user, Step 2: Fetch todos
- `getTodoById()` - Step 1: Validate user, Step 2: Find specific todo
- `createTodo()` - Step 1: Validate user, Step 2: Create todo
- `updateTodo()` - Step 1: Validate user + todo, Step 2: Update todo
- `deleteTodo()` - Step 1: Validate user + todo, Step 2: Delete todo

**UserService.ts:**
- `register()` - Step 1: Check email exists, Step 2: Hash password, Step 3: Create user

---

## How to Maintain/Extend This

### Rule 1: Each Step Must Depend on Previous Steps

```typescript
// ✓ CORRECT: Step 2 uses result from Step 1
const results = await this.transactionManager.executeDependent<any>([
  async (queryRunner) => {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('User not found');
    return user;
  },
  async (queryRunner) => {
    // Uses userId from Step 1
    const todos = await todoRepository.find(userId);
    return todos;
  },
], 'SERIALIZABLE');

// ✗ WRONG: Step 2 doesn't depend on Step 1
const results = await this.transactionManager.executeDependent<any>([
  async (queryRunner) => {
    return await userRepository.findById(userId);
  },
  async (queryRunner) => {
    // Fetches from different userId, doesn't use Step 1
    return await todoRepository.find(differentUserId);
  },
], 'SERIALIZABLE');
```

### Rule 2: Always Validate Before Mutating

```typescript
// ✓ CORRECT: Validate in Step 1, mutate in Step 2
const results = await this.transactionManager.executeDependent<any>([
  async (queryRunner) => {
    // VALIDATION ONLY
    const todo = await todoRepository.find(userId, todoId);
    if (!todo) throw new Error('Todo not found');
    return todo;
  },
  async (queryRunner) => {
    // MUTATION ONLY
    return await todoRepository.update(todoId, userId, newData);
  },
], 'SERIALIZABLE');

// ✗ WRONG: Validate and mutate in same step
const results = await this.transactionManager.executeDependent<any>([
  async (queryRunner) => {
    const todo = await todoRepository.find(userId, todoId);
    if (!todo) throw new Error('Todo not found');
    // MUTATING IMMEDIATELY without full transaction setup
    return await todoRepository.update(todoId, userId, newData);
  },
], 'SERIALIZABLE');
```

### Rule 3: Use SERIALIZABLE for Write Operations

```typescript
// Always use SERIALIZABLE for:
// - Creating entities
// - Updating entities
// - Deleting entities
// - Operations that check conditions then modify

await this.transactionManager.executeDependent<any>(
  [...operations...],
  'SERIALIZABLE' // ← Always for writes
);

// Use READ_COMMITTED for read-only operations
await this.transactionManager.executeDependent<any>(
  [...readOnlyOperations...],
  'READ_COMMITTED'
);
```

---

## Transaction Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ executeDependent() - Start Transaction with SERIALIZABLE    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
         ┌─────────────────────────────────────┐
         │ Operation 1: Validate User Exists   │
         │ - Query: SELECT * FROM users ...    │
         │ - Check: if (!user) throw error     │
         └─────────────────────────────────────┘
                           │
                    ✓ Success? ↓
                           │
         ┌─────────────────────────────────────┐
         │ Operation 2: Fetch/Create/Update    │
         │ - Query: SELECT/INSERT/UPDATE ...   │
         │ - Check: if (!result) throw error   │
         └─────────────────────────────────────┘
                           │
                    ✓ Success? ↓
                           │
         ┌─────────────────────────────────────┐
         │ COMMIT TRANSACTION                  │
         │ - All changes saved to database     │
         │ - Return results array              │
         └─────────────────────────────────────┘

OR if any step fails:

         ┌─────────────────────────────────────┐
         │ ROLLBACK TRANSACTION                │
         │ - All changes discarded             │
         │ - Throw error to caller             │
         └─────────────────────────────────────┘
```

---

## Summary

Your dependent transactions:
1. **Prevent race conditions** - SERIALIZABLE isolation locks data until transaction completes
2. **Guarantee consistency** - All steps succeed together or all fail together
3. **Enable safe operations** - Validate data in Step 1, modify in Step 2
4. **Maintain data integrity** - No orphaned records or inconsistent states

**Remember:** Each operation in the array is a **STEP** that depends on previous steps succeeding. If any step throws an error, the entire transaction is rolled back!
