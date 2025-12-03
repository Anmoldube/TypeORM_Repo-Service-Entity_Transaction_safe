# Transaction Safety Visual Comparison

## BEFORE: Independent Transactions (UNSAFE) ❌

```
User Service Call: createTodo(text, userId)
│
├─► Transaction 1: Validate User
│   ├─► SELECT * FROM users WHERE id = userId
│   └─► Connection Released ✓
│
│   ⚠️ DANGER ZONE: User could be deleted here!
│
└─► Transaction 2: Create Todo
    ├─► INSERT INTO todos (text, authorId, ...)
    └─► Connection Released ✓

Race Condition Scenario:
═════════════════════════════════════════════════════════
Time  Thread A (createTodo)              Thread B (deleteUser)
────  ──────────────────────────────────  ──────────────────────
T1    SELECT user WHERE id=5 ✓ Found
T2                                       DELETE FROM users WHERE id=5 ✓
T3    INSERT todo (authorId=5) ✗ Orphan!
```

**Problems:**
- Two separate transactions
- No locks held during validation
- User can be deleted between validation and insert
- Orphaned todos created for deleted users

---

## AFTER: Dependent Transactions (SAFE) ✅

```
User Service Call: createTodo(text, userId, 'SERIALIZABLE')
│
└─► BEGIN TRANSACTION (SERIALIZABLE isolation)
    │
    ├─► Step 1: Validate User
    │   ├─► SELECT * FROM users WHERE id = userId
    │   ├─► Shared Lock Acquired on User Row
    │   └─► IF NOT FOUND → ROLLBACK (no Step 2)
    │
    ├─► Step 2: Create Todo
    │   ├─► INSERT INTO todos (text, authorId, ...)
    │   ├─► Exclusive Lock Acquired on Todos
    │   └─► IF ERROR → ROLLBACK both steps
    │
    └─► COMMIT (both operations atomic)
        └─► All locks released

Safe Concurrency Scenario:
═════════════════════════════════════════════════════════
Time  Thread A (createTodo)              Thread B (deleteUser)
────  ──────────────────────────────────  ──────────────────────
T1    BEGIN SERIALIZABLE
T2    SELECT user WHERE id=5 ✓ Found
T3    LOCK ACQUIRED on User(5)
T4                                       DELETE FROM users WHERE id=5
T5                                       ⏳ WAITING for lock from Thread A...
T6    INSERT todo (authorId=5) ✓ Safe
T7    COMMIT (locks released)
T8                                       DELETE FROM users WHERE id=5 ✗ Fails (todo exists)
```

**Benefits:**
- Single transaction with all operations
- Locks held throughout entire operation
- User cannot be deleted while transaction active
- Atomicity: All succeed or all fail

---

## ISOLATION LEVELS COMPARISON

### Scenario: Two concurrent transfers in a bank

```
Transaction A: Transfer $100 from Account A → Account B
Transaction B: Check balance of Account A and B (read)

═════════════════════════════════════════════════════════════════

READ_UNCOMMITTED (No Safety) ❌
────────────────────────────
Time  Transaction A                  Transaction B
───   ────────────────────────      ──────────────────
T1    BEGIN
T2    SELECT balance FROM A ✓ $500
T3                                  SELECT A ✓ $400 (sees T2's uncommitted change!)
T4                                  SELECT B ✓ $100 (sees T2's uncommitted change!)
T5    UPDATE A = A - 100
T6    ROLLBACK! ← Database rolls back
T7                                  B now shows $100 but A still has $500
                                    PROBLEM: Dirty read of uncommitted data!

═════════════════════════════════════════════════════════════════

READ_COMMITTED (Medium Safety) ⚠️
──────────────────────────────
Time  Transaction A                  Transaction B
───   ────────────────────────      ──────────────────
T1    BEGIN
T2    SELECT balance FROM A ✓ $500
T3    Lock acquired on A
T4                                  SELECT A ✓ $500 (committed value)
T5    UPDATE A = A - 100
T6    UPDATE B = B + 100
T7    COMMIT
T8                                  SELECT B ✓ $600 (different from T4!)
                                    PROBLEM: Non-repeatable read!

═════════════════════════════════════════════════════════════════

REPEATABLE_READ (High Safety) ✅
────────────────────────────
Time  Transaction A                  Transaction B
───   ────────────────────────      ──────────────────
T1    BEGIN REPEATABLE_READ
T2    SELECT balance FROM A ✓ $500
T3    Snapshot taken at T2
T4                                  SELECT A ✓ $500
T5                                  INSERT new account C
T6    UPDATE A = A - 100
T7    UPDATE B = B + 100
T8    SELECT from accounts
T9    ← Still sees only A, B (not new C) - Consistent within snapshot
T10   COMMIT
                                    LIMITATION: May see phantom rows
                                    if query range changes

═════════════════════════════════════════════════════════════════

SERIALIZABLE (Maximum Safety) ✅✅
───────────────────────────────
Time  Transaction A                  Transaction B
───   ────────────────────────      ──────────────────
T1    BEGIN SERIALIZABLE
T2    SELECT balance FROM A ✓ $500
T3    Range lock acquired on accounts table
T4                                  SELECT A ⏳ WAITING
T5                                  ⏳ Still waiting for lock...
T6    UPDATE A = A - 100
T7    UPDATE B = B + 100
T8    COMMIT (lock released)
T9                                  SELECT A ✓ $400 (sees committed change)
                                    SAFE: No dirty/non-repeatable/phantom reads
                                    COST: Slower (lock held entire transaction)
```

---

## YOUR CODE: Transaction Flow Examples

### Example 1: Safe Todo Creation with Dependencies

```typescript
async createTodo(text: string, userId: number) {
  const results = await this.transactionManager.executeDependent(
    [
      // Step 1
      async (queryRunner) => {
        const userRepository = new UserRepository(qr.manager.connection, qr.manager);
        const user = await userRepository.findById(userId);
        if (!user) throw new Error('User not found');
        return user;
      },
      // Step 2 (only runs if Step 1 succeeds)
      async (queryRunner) => {
        const todoRepository = new TodoRepository(qr.manager.connection, qr.manager);
        const todo = await todoRepository.create(text, userId);
        return todo;
      },
    ],
    'SERIALIZABLE'
  );
  return results[1];
}

Visual Flow:
════════════════════════════════════════════════
BEGIN TRANSACTION (SERIALIZABLE)
  │
  ├─ Step 1: [User Validation]
  │  ├─ SELECT user WHERE id = userId
  │  ├─ Lock acquired ✓
  │  └─ Returns: User object
  │
  ├─ Step 2: [Todo Creation]
  │  ├─ INSERT INTO todos (...)
  │  ├─ Lock acquired ✓
  │  └─ Returns: Todo object
  │
  └─ COMMIT ✓
     └─ results = [User, Todo]
        return results[1] → Todo object
```

### Example 2: Safe User Registration (Prevents Duplicates)

```typescript
async register(email: string, password: string, name?: string) {
  const results = await this.transactionManager.executeDependent(
    [
      // Step 1: Check if email exists
      async (queryRunner) => {
        const userRepository = new UserRepository(qr.manager.connection, qr.manager);
        const exists = await userRepository.exists(email);
        if (exists) throw new Error('User exists');
        return null;
      },
      // Step 2: Hash password (only if email check passed)
      async (queryRunner) => {
        const hashedPassword = await hashPassword(password);
        return hashedPassword;
      },
      // Step 3: Create user (only if email & hash steps passed)
      async (queryRunner) => {
        const userRepository = new UserRepository(qr.manager.connection, qr.manager);
        const user = await userRepository.create(email, results[1], name);
        return user;
      },
    ],
    'SERIALIZABLE' // Prevent duplicate registrations
  );
  return results[2];
}

Duplicate Registration Prevention:
═════════════════════════════════════════════════════════
Time  Thread A (register test@ex.com)   Thread B (register test@ex.com)
────  ─────────────────────────────────  ─────────────────────────────
T1    BEGIN SERIALIZABLE
T2                                       BEGIN SERIALIZABLE
T3    SELECT email WHERE email='...'
T4    ← NOT FOUND ✓
T5    LOCK acquired on email index
T6                                       SELECT email WHERE email='...'
T7                                       ⏳ WAITING for lock...
T8    INSERT user (test@ex.com)
T9    COMMIT (lock released)
T10                                      SELECT email WHERE email='...'
T11                                      ← FOUND ✓ (from T9!)
T12                                      Throw 'User exists' error
T13                                      ROLLBACK ✗

Result: Only one user created, second registration fails appropriately!
```

### Example 3: Unsafe Update (What NOT to do)

```
❌ UNSAFE PATTERN:

async updateTodo(id, userId, updates) {
  const todo = await todoRepository.findById(id, userId);  // Transaction 1
  // ⏳ Gap: Todo could be deleted here!
  const updated = await todoRepository.update(id, userId, updates);  // Transaction 2
  return updated;
}

Race Condition:
Time  Thread A                    Thread B
────  ──────────────────────────  ──────────────
T1    findById(5, user1) ✓ Found
T2                                delete(5) ✓
T3    update(5, ...) ✗ No effect!
      Returns null or empty result
```

```
✅ SAFE PATTERN:

async updateTodo(id, userId, updates) {
  const results = await transactionManager.executeDependent(
    [
      // Step 1: Validate todo exists
      async (qr) => {
        const todo = await todoRepository.findById(id, userId, qr);
        if (!todo) throw 'Not found';
        return todo;
      },
      // Step 2: Update (only if validation passed)
      async (qr) => {
        const updated = await todoRepository.update(id, userId, updates, qr);
        if (!updated) throw 'Update failed';
        return updated;
      },
    ],
    'SERIALIZABLE'
  );
  return results[1];
}

No Race Condition:
Time  Thread A                    Thread B
────  ──────────────────────────  ──────────────
T1    BEGIN SERIALIZABLE
T2    findById(5) ✓ Found
T3    LOCK acquired on todo(5)
T4                                delete(5)
T5                                ⏳ WAITING for lock...
T6    update(5, ...) ✓ Success
T7    COMMIT (lock released)
T8                                delete(5) fails or sees deleted row
```

---

## Error Recovery with Savepoints

```typescript
async complexOperation() {
  return await transactionManager.execute(async (qr) => {
    // Main operation
    await step1(qr);
    
    try {
      // Nested operation (uses SAVEPOINT)
      await transactionManager.executeWithSavepoint(step2, qr);
    } catch (error) {
      console.log('Step 2 failed, rolling back only Step 2');
      // Step 1 remains, only Step 2 rolled back
    }
    
    // Continue with remaining steps
    await step3(qr);
  });
}

Savepoint Flow:
═════════════════════════════════════════════
BEGIN TRANSACTION
  │
  ├─ Step 1: ✓ Success
  │
  ├─ SAVEPOINT sp_1
  │  └─ Step 2: ✗ Failed
  │     ROLLBACK TO SAVEPOINT sp_1
  │     (Only Step 2 rolled back, Step 1 still active!)
  │
  ├─ Step 3: ✓ Success
  │
  └─ COMMIT ✓
     (Final state: Step 1 + Step 3, Step 2 rolled back)
```

---

## Configuration Examples

### High Concurrency (E-commerce)

```typescript
const transactionManager = new TransactionManager(dataSource);

// For inventory: Use deadlock retry
transactionManager.setRetryConfig(5, 50);

// For registration: Use serializable (no retry needed)
// - Single operation per user

// For order processing: Use repeatable read
transactionManager.setDefaultIsolationLevel('REPEATABLE_READ');
```

### Low Latency Required (Dashboard/Analytics)

```typescript
const transactionManager = new TransactionManager(dataSource);

// For reads: Use lowest isolation
transactionManager.setDefaultIsolationLevel('READ_COMMITTED');

// For writes: Use serializable only where needed
await transactionManager.execute(callback, 'SERIALIZABLE');
```

---

## Performance Tuning

```
┌─────────────────────────────────────────────────────┐
│         Transaction Strategy Trade-offs             │
├─────────────────────────────────────────────────────┤
│                                                     │
│  SERIALIZABLE                                       │
│    ████████████  Slowest (100%)                    │
│    Safety: ████████████  Perfect                    │
│    Use: Registration, critical writes               │
│                                                     │
│  REPEATABLE_READ                                    │
│    ██████████  Medium (70%)                         │
│    Safety: ██████████  Good                         │
│    Use: Financial ops, inventory                    │
│                                                     │
│  READ_COMMITTED                                     │
│    ████  Fastest (30%)                              │
│    Safety: ██████  OK                               │
│    Use: General reads, bulk ops                     │
│                                                     │
└─────────────────────────────────────────────────────┘

Recommendation: Start with READ_COMMITTED,
                use SERIALIZABLE only for:
                - Registration/unique constraints
                - Critical financial operations
                - User deletions
```

