# Transaction Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        HTTP Requests                             │
│              (Controllers - Route handlers)                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  UserService                                             │   │
│  │  ├─ register()        ← Uses executeDependent ✅        │   │
│  │  ├─ login()           ← No transaction needed           │   │
│  │  └─ getUserById()     ← No transaction needed           │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  TodoService                                             │   │
│  │  ├─ getTodos()        ← No transaction needed           │   │
│  │  ├─ getTodoById()     ← No transaction needed           │   │
│  │  ├─ createTodo()      ← Uses executeDependent ✅        │   │
│  │  ├─ updateTodo()      ← Uses executeDependent ✅        │   │
│  │  └─ deleteTodo()      ← Uses executeDependent ✅        │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│               Transaction Management Layer                       │
│                                                                  │
│  ┌─ TransactionManager ─────────────────────────────────────┐   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │ execute(callback, isolationLevel)                   │ │   │
│  │  │ ├─ Standard transaction wrapper                     │ │   │
│  │  │ ├─ Specifies isolation level                        │ │   │
│  │  │ └─ For simple single-step operations               │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  │                                                            │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │ executeDependent(operations[], isolationLevel) ✅  │ │   │
│  │  │ ├─ Multiple dependent steps                         │ │   │
│  │  │ ├─ All succeed or all rollback together            │ │   │
│  │  │ ├─ Locks held throughout all steps                 │ │   │
│  │  │ └─ For validation → action patterns                │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  │                                                            │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │ executeWithSavepoint(callback, queryRunner)         │ │   │
│  │  │ ├─ Nested transaction within existing transaction  │ │   │
│  │  │ ├─ Partial rollback capability                     │ │   │
│  │  │ └─ Transparent to execute()                        │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  │                                                            │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │ executeWithRetry(callback, isolationLevel)          │ │   │
│  │  │ ├─ Auto-retry on deadlock                          │ │   │
│  │  │ ├─ Exponential backoff (100ms, 200ms, 400ms, ...)  │ │   │
│  │  │ └─ For high-concurrency scenarios                  │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Repository Layer                               │
│  ┌──────────────────────┐    ┌──────────────────────┐           │
│  │   UserRepository     │    │   TodoRepository     │           │
│  │                      │    │                      │           │
│  │  ├─ findById()       │    │  ├─ findById()       │           │
│  │  ├─ findByEmail()    │    │  ├─ findByAuthor()   │           │
│  │  ├─ create()         │    │  ├─ create()         │           │
│  │  ├─ update()         │    │  ├─ update()         │           │
│  │  ├─ delete()         │    │  ├─ delete()         │           │
│  │  └─ exists()         │    │  └─ exists()         │           │
│  └──────────────────────┘    └──────────────────────┘           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TypeORM (Data Access)                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  QueryRunner (from transaction)                          │   │
│  │  ├─ queryRunner.manager                                  │   │
│  │  ├─ queryRunner.isTransactionActive                      │   │
│  │  ├─ queryRunner.query() [for savepoints]                 │   │
│  │  └─ queryRunner.startTransaction(isolationLevel)         │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Tables:                                                 │   │
│  │  ├─ users (id, email, password, name, createdAt, ...)  │   │
│  │  └─ todos (id, text, authorId, status, priority, ...)  │   │
│  │                                                          │   │
│  │  Transactions (ACID):                                    │   │
│  │  ├─ Atomicity  ✅ (All steps or none)                   │   │
│  │  ├─ Consistency ✅ (Data integrity)                      │   │
│  │  ├─ Isolation  ✅ (Configurable levels)                 │   │
│  │  └─ Durability  ✅ (Persistent)                         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Transaction Flow Examples

### Example 1: Safe Todo Creation

```
HTTP POST /api/todos
{text: "Buy milk", userId: 5}
        │
        ▼
TodoController.createTodo()
        │
        ▼
TodoService.createTodo()
        │
        ▼
transactionManager.executeDependent([...], 'SERIALIZABLE')
        │
        ├──── Transaction 1: BEGIN SERIALIZABLE ─────┐
        │                                              │
        │     Step 1: Validate User (LOCKED)          │
        │     ├─ SELECT user WHERE id = 5             │
        │     ├─ Row lock acquired ✓                  │
        │     └─ User found ✓                          │
        │                                              │
        │     Step 2: Create Todo (LOCKED)            │
        │     ├─ INSERT into todos (...)              │
        │     ├─ Table lock acquired ✓                │
        │     └─ Returns new Todo ✓                    │
        │                                              │
        │     COMMIT (locks released)                 │
        │                                              │
        └───────────────────────────────────────────┘
        │
        ▼
Return 201 {id: 123, text: "Buy milk", ...}
```

**Safety Guarantees:**
- ✅ User row locked during entire transaction
- ✅ Todo cannot be inserted if user validation fails
- ✅ No orphaned todos possible
- ✅ Atomic: All or nothing

---

### Example 2: Safe User Registration

```
HTTP POST /api/register
{email: "john@example.com", password: "secret123"}
        │
        ▼
authController.register()
        │
        ▼
UserService.register()
        │
        ▼
transactionManager.executeDependent([...], 'SERIALIZABLE')
        │
        ├──── Transaction 1: BEGIN SERIALIZABLE ─────┐
        │                                              │
        │     Step 1: Check Email (LOCKED)            │
        │     ├─ SELECT count(*) WHERE email=...      │
        │     ├─ Email index lock acquired ✓          │
        │     ├─ Count: 0 (not taken) ✓               │
        │     └─ Returns null                          │
        │                                              │
        │     Step 2: Hash Password                   │
        │     ├─ await bcrypt.hash(password)          │
        │     └─ Returns hashed password               │
        │                                              │
        │     Step 3: Create User (LOCKED)            │
        │     ├─ INSERT into users (...)              │
        │     ├─ Table lock acquired ✓                │
        │     ├─ Unique constraint enforced ✓         │
        │     └─ Returns new User ✓                    │
        │                                              │
        │     COMMIT (locks released)                 │
        │                                              │
        └───────────────────────────────────────────┘
        │
        ▼
Generate JWT token
        │
        ▼
Return 201 {user: {id, email}, token}
```

**Safety Guarantees:**
- ✅ Email uniqueness enforced even under concurrent load
- ✅ Two clients cannot register same email simultaneously
- ✅ All steps atomic: all succeed or all rollback
- ✅ Token only generated after successful registration

---

### Example 3: Concurrent Request Handling

```
Concurrent Scenario: Two threads try to create todo for user_id=5

Thread A                            Thread B
─────────────────────────────────────────────────────────
1. BEGIN SERIALIZABLE
2. SELECT user WHERE id=5
3. LOCK acquired on row ──┐
4.                        │
5.                        │ BEGIN SERIALIZABLE
6.                        │ SELECT user WHERE id=5
7.                        │ ⏳ WAITING for lock
8.                        │ ⏳ (Thread A holds it)
9. INSERT todo (text="A")
10. COMMIT
11. Lock released ────────┘
12.                       │ LOCK acquired
13.                       │ SELECT found ✓
14.                       │ INSERT todo (text="B")
15.                       │ COMMIT

Result:
├─ User: 1 record
├─ Todos: 2 records (both for user_id=5)
└─ Both inserts succeeded sequentially ✅
```

**Key Points:**
- Thread B waits for Thread A's lock
- No race condition possible
- Operations execute in serializable order
- Both succeed

---

### Example 4: Deadlock Scenario with Retry

```
Concurrent Scenario: Both threads try to transfer money
(if you had finance operations)

Thread A                            Thread B
─────────────────────────────────────────────────────────
1. BEGIN (accounts table)
2. SELECT account A
3. LOCK acquired on A ────┐
4.                        │
5.                        │ BEGIN (accounts table)
6.                        │ SELECT account B
7.                        │ LOCK acquired on B ────┐
8.                        │
9. UPDATE account B       │
10. ⏳ WAITING lock on B  │
11.                       │
12.                       │ UPDATE account A
13.                       │ ⏳ WAITING lock on A
14.                       │
    ⚠️ DEADLOCK DETECTED!

executeWithRetry() activates:
├─ ROLLBACK Thread A (release locks)
├─ ROLLBACK Thread B (release locks)
├─ Wait 100ms (exponential backoff)
├─ Retry Thread A
├─ Retry Thread B
└─ Success (no deadlock on retry)
```

**Key Points:**
- Auto-retry activated on deadlock
- Exponential backoff (100ms, 200ms, 400ms...)
- Transparent to caller
- Reliable transaction completion

---

## Isolation Level Scenarios

### Scenario 1: READ_UNCOMMITTED (Dirty Read) ❌

```
Transaction A                    Transaction B
──────────────────────────────────────────────
1. BEGIN
2. SELECT balance FROM A
3. WHERE user_id = 1
4. Result: $500
5.                              BEGIN
6.                              SELECT FROM A
7.                              WHERE user_id = 1
8.                              Result: $500 (sees
9.                              uncommitted change!)
10. UPDATE A = A - 100
11. ← Decides to cancel!
12. ROLLBACK
13.                             But Transaction B
14.                             saw balance = $400
15.                             (from step 10)
                                ← Dirty read! ❌
```

---

### Scenario 2: READ_COMMITTED (Default) ⚠️

```
Transaction A                    Transaction B
──────────────────────────────────────────────
1. BEGIN
2. SELECT balance FROM A
3. Result: $500
4.                              BEGIN
5.                              UPDATE A SET bal = 400
6.                              COMMIT
7. SELECT balance FROM A
8. Result: $400 (different!) 
            ← Non-repeatable read ⚠️
```

---

### Scenario 3: REPEATABLE_READ ✅

```
Transaction A                    Transaction B
──────────────────────────────────────────────
1. BEGIN REPEATABLE_READ
2. Snapshot taken at T2
3. SELECT balance FROM A
4. Result: $500
5.                              BEGIN
6.                              UPDATE A SET bal = 400
7.                              COMMIT
8. SELECT balance FROM A
9. Result: $500 (same snapshot!)
            ← Repeatable read ✅
```

---

### Scenario 4: SERIALIZABLE ✅✅

```
Transaction A                    Transaction B
──────────────────────────────────────────────
1. BEGIN SERIALIZABLE
2. SELECT balance FROM A
3. LOCK acquired
4.                              BEGIN SERIALIZABLE
5.                              SELECT balance FROM A
6.                              ⏳ WAITING for lock
7. UPDATE A SET bal = 400
8. COMMIT (lock released)
9.                              SELECT balance FROM A
10.                             Result: $400 (committed)
                                ← Complete isolation ✅✅
```

---

## Configuration Recommendations

### Development Environment
```typescript
// Use SERIALIZABLE for all operations to catch issues
transactionManager.setDefaultIsolationLevel('SERIALIZABLE');

// Generous retries for testing
transactionManager.setRetryConfig(5, 100);
```

### Staging Environment
```typescript
// Mixed approach - safe by default
transactionManager.setDefaultIsolationLevel('READ_COMMITTED');

// Use SERIALIZABLE explicitly where needed
// Test under realistic load
```

### Production Environment
```typescript
// Balanced approach
transactionManager.setDefaultIsolationLevel('READ_COMMITTED');

// Use SERIALIZABLE for:
// - User registration
// - User deletion
// - Any unique constraint enforcement
// - Financial operations

// Use REPEATABLE_READ for:
// - Inventory management
// - Multi-step business logic with reads

// Use READ_COMMITTED for:
// - General CRUD
// - Bulk operations
```

---

## Monitoring & Debugging

### Check Active Transactions (PostgreSQL)
```sql
SELECT * FROM pg_stat_activity 
WHERE state = 'active' 
OR state = 'idle in transaction';
```

### Check Locks (PostgreSQL)
```sql
SELECT * FROM pg_locks 
WHERE NOT granted;
```

### Check Transaction Isolation (PostgreSQL)
```sql
SHOW transaction_isolation;
```

### Database Logs
```sql
-- PostgreSQL: log long-running transactions
log_min_duration_statement = 1000  -- 1 second
log_lock_waits = on
```

---

## Summary

Your transaction system now provides:

1. **Safety** ✅
   - No race conditions
   - No duplicate registrations
   - No orphaned data
   - Atomic operations

2. **Flexibility** ✅
   - Configurable isolation levels
   - Automatic retry on deadlock
   - Nested transaction support

3. **Clarity** ✅
   - Explicit step boundaries
   - Clear error messages
   - Easy to understand flow

4. **Scalability** ✅
   - Handles concurrent requests
   - Automatic recovery from deadlocks
   - Production-ready

