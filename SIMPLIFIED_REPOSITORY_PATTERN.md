# Simplified Repository Pattern - Usage Guide

## Before: Complex Custom Wrapper

```typescript
export class TodoRepository {
  private repo: Repository<Todo>;
  private entityManager?: EntityManager;

  constructor(dataSource: DataSource, entityManager?: EntityManager) {
    this.entityManager = entityManager;
    this.repo = entityManager
      ? entityManager.getRepository(Todo)
      : dataSource.getRepository(Todo);
  }
  // ... rest of methods
}
```

**Problem:** Confusing EntityManager handling, complex constructor logic

---

## After: Clean TypeORM Standard Pattern

```typescript
// Helper function to get repository from DataSource or EntityManager
export const getTodoRepository = (dataSourceOrManager: DataSource | EntityManager): Repository<Todo> => {
  if (dataSourceOrManager instanceof DataSource) {
    return dataSourceOrManager.getRepository(Todo);
  }
  return dataSourceOrManager.getRepository(Todo);
};

export class TodoRepository {
  private repo: Repository<Todo>;

  // Simple constructor - accepts both DataSource and EntityManager
  constructor(dataSource: DataSource | EntityManager) {
    this.repo = getTodoRepository(dataSource);
  }
  // ... rest of methods
}
```

**Benefits:**
- ✅ Simpler constructor
- ✅ Handles both DataSource and EntityManager automatically
- ✅ Clean, TypeORM-standard approach

---

## Usage Examples

### 1. In Services (Normal Queries)
```typescript
export class TodoService {
  constructor(dataSource: DataSource) {
    this.todoRepository = new TodoRepository(dataSource);
  }

  async getTodos(userId: number) {
    return await this.todoRepository.findByAuthor(userId);
  }
}
```

### 2. In Transactions (With QueryRunner)
```typescript
async createTodo(text: string, userId: number) {
  const results = await this.transactionManager.executeDependent(
    [
      async (queryRunner) => {
        // Pass EntityManager directly - our constructor handles it!
        const userRepository = new UserRepository(queryRunner.manager);
        const user = await userRepository.findById(userId);
        return user;
      },
      async (queryRunner) => {
        const todoRepository = new TodoRepository(queryRunner.manager);
        const todo = await todoRepository.create(text, userId);
        return todo;
      },
    ],
    'SERIALIZABLE'
  );
  return results[1];
}
```

**Key Point:** `queryRunner.manager` is an EntityManager, and your repository constructor automatically handles it! ✅

---

## Direct Repository Usage (Optional)

If you want to use TypeORM repositories directly without the wrapper class:

```typescript
// In service/controller
const todoRepository = AppDataSource.getRepository(Todo);
const todos = await todoRepository.find({ where: { authorId: userId } });

// In transaction
const todoRepository = queryRunner.manager.getRepository(Todo);
const todo = await todoRepository.save({ text, authorId: userId });
```

---

## Comparison Table

| Aspect       | Before                                            | After                                          |
| ------------ | ------------------------------------------------- | ---------------------------------------------- |
| Constructor  | `constructor(ds: DataSource, em?: EntityManager)` | `constructor(ds: DataSource \| EntityManager)` |
| Complexity   | Higher (manual branching)                         | Lower (automatic detection)                    |
| Usage        | `new TodoRepository(ds, em?)`                     | `new TodoRepository(ds or em)`                 |
| Flexibility  | Requires both params                              | Accepts either                                 |
| Code Clarity | Multiple conditionals                             | Single union type                              |

---

## File Changes Summary

### `TodoRepository.ts`
- ✅ Added `getTodoRepository()` helper
- ✅ Simplified constructor
- ✅ Now accepts `DataSource | EntityManager`
- ✅ All methods unchanged

### `UserRepository.ts`
- ✅ Added `getUserRepository()` helper
- ✅ Simplified constructor
- ✅ Now accepts `DataSource | EntityManager`
- ✅ All methods unchanged

### `TodoService.ts`
- ✅ Updated to use `new UserRepository(queryRunner.manager)`
- ✅ Updated to use `new TodoRepository(queryRunner.manager)`
- ✅ Removed `queryRunner.manager.connection as DataSource` casts

### `UserService.ts`
- ✅ Updated to use `new UserRepository(queryRunner.manager)`
- ✅ Removed type casting

---

## Benefits

1. **Simpler Code**
   - No type casting needed
   - Cleaner constructor signature

2. **More Flexible**
   - Works with DataSource
   - Works with EntityManager
   - Works in transactions

3. **Better Type Safety**
   - Union type instead of optional parameter
   - TypeScript handles the logic

4. **Follows TypeORM Standards**
   - Uses standard repository pattern
   - Familiar to TypeORM developers

