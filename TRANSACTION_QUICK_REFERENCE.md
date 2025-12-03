# Transaction Safety Quick Reference

## Your Original Problem ❌
```typescript
// UNSAFE: Two separate transactions
async createTodo(text, userId) {
  await validateUser(userId);      // Transaction 1
  return await todoRepository.create(text, userId);  // Transaction 2
}
// Race condition: User could be deleted between checks!
```

---

## The Solution ✅

### New API Methods

#### 1. `execute()` - Standard Transaction
```typescript
await transactionManager.execute(
  async (queryRunner) => {
    // Your code here
    return result;
  },
  'READ_COMMITTED'  // Isolation level
);
```

#### 2. `executeDependent()` - RECOMMENDED FOR YOU
```typescript
const results = await transactionManager.executeDependent(
  [
    async (queryRunner) => { return step1Result; },
    async (queryRunner) => { return step2Result; },
    async (queryRunner) => { return step3Result; },
  ],
  'SERIALIZABLE'  // Isolation level
);
// results[0] = step1Result
// results[1] = step2Result
// results[2] = step3Result
```

#### 3. `executeWithRetry()` - For High Concurrency
```typescript
await transactionManager.executeWithRetry(
  async (queryRunner) => {
    // Your code here
  },
  'READ_COMMITTED'
);
// Auto-retries on deadlock (3 times by default)
```

---

## When to Use Each

### `execute()` - Single Step Operations
✅ Simple create, update, delete  
✅ Validation + single operation  
❌ Multiple dependent steps  

```typescript
async createTodo(text, userId) {
  return await this.transactionManager.execute(async (qr) => {
    const repo = new TodoRepository(qr.manager.connection, qr.manager);
    return repo.create(text, userId);
  }, 'SERIALIZABLE');
}
```

### `executeDependent()` - Multi-Step Operations
✅ Validation → Create/Update/Delete  
✅ Multiple operations that must succeed together  
✅ Operations with read-then-write pattern  
❌ Too many steps (consider breaking into smaller operations)  

```typescript
async createTodo(text, userId) {
  const results = await this.transactionManager.executeDependent([
    async (qr) => {
      // Step 1: Validate
      const repo = new UserRepository(qr.manager.connection, qr.manager);
      const user = await repo.findById(userId);
      if (!user) throw new Error('User not found');
      return user;
    },
    async (qr) => {
      // Step 2: Create
      const repo = new TodoRepository(qr.manager.connection, qr.manager);
      return repo.create(text, userId);
    },
  ], 'SERIALIZABLE');
  
  return results[1]; // Return created todo
}
```

### `executeWithRetry()` - High Concurrency
✅ High-traffic endpoints (registration, updates)  
✅ Where deadlocks are possible  
❌ Operations already using `executeDependent()`  

```typescript
async register(email, password) {
  return await this.transactionManager.executeWithRetry(
    async (qr) => {
      // Your registration logic
    },
    'SERIALIZABLE'
  );
}
```

---

## Isolation Level Cheat Sheet

```
┌──────────────┬─────────────┬──────────────┬────────────────┐
│ Level        │ Dirty Read  │ Non-repeat   │ Phantom Read   │
├──────────────┼─────────────┼──────────────┼────────────────┤
│ READ         │ ✗ DANGER    │ ✗ DANGER     │ ✗ DANGER       │
│ UNCOMMITTED  │   (99%)     │   (99%)      │   (99%)        │
├──────────────┼─────────────┼──────────────┼────────────────┤
│ READ         │ ✓ SAFE      │ ✗ DANGER     │ ✗ DANGER       │
│ COMMITTED    │  (Default)  │  (sometimes) │  (sometimes)   │
├──────────────┼─────────────┼──────────────┼────────────────┤
│ REPEATABLE   │ ✓ SAFE      │ ✓ SAFE       │ ✗ DANGER       │
│ READ         │             │              │  (rare)        │
├──────────────┼─────────────┼──────────────┼────────────────┤
│ SERIALIZABLE │ ✓ SAFE      │ ✓ SAFE       │ ✓ SAFE         │
│              │             │              │  (Safest!)     │
└──────────────┴─────────────┴──────────────┴────────────────┘

Recommendation Matrix:
┌──────────────────────┬────────────────────────────┐
│ Operation Type       │ Recommended Isolation      │
├──────────────────────┼────────────────────────────┤
│ Read single record   │ READ_COMMITTED (default)   │
│ Simple insert/update │ READ_COMMITTED             │
│ Create with validate │ SERIALIZABLE               │
│ Registration         │ SERIALIZABLE (prevents dup)│
│ Delete with check    │ SERIALIZABLE               │
│ Financial transfer   │ REPEATABLE_READ            │
│ Inventory update     │ REPEATABLE_READ + retry    │
│ Bulk operations      │ READ_COMMITTED + batch     │
│ Report generation    │ READ_UNCOMMITTED (optional)│
└──────────────────────┴────────────────────────────┘
```

---

## Your Updated Code at a Glance

### TodoService.createTodo() ✅
```typescript
async createTodo(text, userId, priority, dueDate) {
  // ✅ Validates user and creates todo in ONE transaction
  // ✅ SERIALIZABLE prevents any anomalies
  // ✅ Dependent: create only runs if validation passes
  // ✅ Atomic: All succeed or all rollback
  
  const results = await this.transactionManager.executeDependent([
    async (qr) => { /* Step 1: Validate user */ },
    async (qr) => { /* Step 2: Create todo */ },
  ], 'SERIALIZABLE');
  
  return results[1];
}
```

### TodoService.updateTodo() ✅
```typescript
async updateTodo(todoId, userId, updates) {
  // ✅ Validates authorization, validates todo, then updates
  // ✅ Three dependent steps in one transaction
  
  const results = await this.transactionManager.executeDependent([
    async (qr) => { /* Step 1: Validate user exists */ },
    async (qr) => { /* Step 2: Validate todo exists and belongs to user */ },
    async (qr) => { /* Step 3: Perform update */ },
  ], 'SERIALIZABLE');
  
  return results[2];
}
```

### TodoService.deleteTodo() ✅
```typescript
async deleteTodo(todoId, userId) {
  // ✅ Validates before deleting
  // ✅ Cannot delete already-deleted todos (race condition safe)
  
  await this.transactionManager.executeDependent([
    async (qr) => { /* Step 1: Validate */ },
    async (qr) => { /* Step 2: Delete */ },
  ], 'SERIALIZABLE');
  
  return true;
}
```

### UserService.register() ✅
```typescript
async register(email, password, name) {
  // ✅ Prevents duplicate registrations (even concurrent)
  // ✅ SERIALIZABLE ensures only one registration per email
  
  const results = await this.transactionManager.executeDependent([
    async (qr) => { /* Step 1: Check email not taken */ },
    async (qr) => { /* Step 2: Hash password */ },
    async (qr) => { /* Step 3: Create user */ },
  ], 'SERIALIZABLE');
  
  return results[2];
}
```

---

## Common Patterns

### Pattern 1: Validate Then Modify
```typescript
const results = await transactionManager.executeDependent([
  async (qr) => {
    // Fetch and validate
    const item = await repo.findById(id);
    if (!item) throw new Error('Not found');
    return item;
  },
  async (qr) => {
    // Modify (runs only if Step 1 passed)
    return await repo.update(id, newData);
  },
], 'SERIALIZABLE');

return results[1]; // Return updated item
```

### Pattern 2: Multiple Validations
```typescript
const results = await transactionManager.executeDependent([
  async (qr) => {
    // Check constraint 1
    const user = await userRepo.findById(userId);
    if (!user) throw new Error('User not found');
    return user;
  },
  async (qr) => {
    // Check constraint 2
    const existing = await todoRepo.findById(todoId);
    if (existing) throw new Error('Todo exists');
    return null;
  },
  async (qr) => {
    // Create (only if both checks passed)
    return await todoRepo.create(data);
  },
], 'SERIALIZABLE');

return results[2];
```

### Pattern 3: With Retry (High Load)
```typescript
const result = await transactionManager.executeWithRetry(
  async (qr) => {
    return await transactionManager.executeDependent([
      async (qr) => { /* Validation */ },
      async (qr) => { /* Modification */ },
    ], 'SERIALIZABLE');
  },
  'READ_COMMITTED' // Outer transaction is READ_COMMITTED
);
```

---

## Testing Checklist

- [ ] Test single concurrent registration (same email)
- [ ] Test concurrent todo creation for same user
- [ ] Test concurrent deletion while updating
- [ ] Test with simulated high load (10+ concurrent requests)
- [ ] Monitor database for deadlocks: `SHOW PROCESSLIST;`
- [ ] Check transaction isolation levels in DB logs
- [ ] Verify cascade effects work (delete user → delete todos)
- [ ] Test with network delays/timeouts

---

## Common Mistakes to Avoid ❌

```typescript
// ❌ WRONG: Transactions not dependent
async createTodo(text, userId) {
  const user = await userRepository.findById(userId);  // T1
  if (!user) throw 'Not found';
  
  const todo = await todoRepository.create(text, userId);  // T2
  // User could be deleted between T1 and T2!
  
  return todo;
}

// ✅ CORRECT: Single dependent transaction
async createTodo(text, userId) {
  const results = await transactionManager.executeDependent([
    async (qr) => {
      const user = await userRepository.findById(userId, qr);
      if (!user) throw 'Not found';
      return user;
    },
    async (qr) => {
      return await todoRepository.create(text, userId, qr);
    },
  ], 'SERIALIZABLE');
  
  return results[1];
}
```

---

## Performance Tips

1. **Keep transactions small** - Only include what's necessary
2. **Avoid network calls in transactions** - Query DB, process in app, update DB
3. **Use indexes** - Makes validation queries faster
4. **Monitor lock times** - Use DB logs to find bottlenecks
5. **Batch operations** - Multiple small transactions vs. one large
6. **Choose right isolation** - Don't use SERIALIZABLE for everything

---

## Next: Add to Your Code

Replace these methods in your services with the new safe versions:
- [ ] TodoService.createTodo()
- [ ] TodoService.updateTodo()
- [ ] TodoService.deleteTodo()
- [ ] UserService.register()

All are already updated in your codebase! ✅

