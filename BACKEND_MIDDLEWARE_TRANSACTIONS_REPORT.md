# Backend Codebase Report: Middleware & Transactions

## Executive Summary

This backend application uses Express.js with TypeORM and implements two critical systems:
1. **Middleware Layer**: For authentication, CORS, request logging, and error handling
2. **Transaction Management**: For ensuring data consistency and preventing race conditions

Both systems work together to provide a secure, reliable, and observable API.

---

## Architecture Overview

```
Client Request
    ↓
CORS Middleware (cors)
    ↓
JSON Parser (express.json)
    ↓
Request Logger (requestLogger)
    ↓
Route Handler
    ↓
Authentication Middleware (authenticateToken) [if protected route]
    ↓
Controller
    ↓
Service Layer (with TransactionManager)
    ↓
Repository Layer (database operations)
    ↓
Response Back to Client
```

---

## 1. MIDDLEWARE LAYER

### 1.1 Global Middleware Setup

**Location**: `backend/index.ts` (lines 25-31)

```typescript
app.use(cors());
app.use(express.json());
app.use(requestLogger);
```

**Execution Order**:
1. **CORS Middleware** - Handles cross-origin requests
2. **JSON Parser** - Parses incoming JSON request bodies
3. **Request Logger** - Logs all requests/responses

### 1.2 Authentication Middleware

**Location**: `backend/src/middleware/auth.ts`

#### Purpose
- Validates JWT tokens from request headers
- Extracts user information from tokens
- Protects routes requiring authentication

#### Implementation Details

**Function**: `authenticateToken()`
- **Input**: Bearer token in Authorization header
- **Output**: Attaches user object to `req.user`
- **Error Handling**: Returns 401 if token missing, 403 if invalid

**Key Features**:
```typescript
- Token Format: "Bearer <JWT_TOKEN>"
- Token Secret: From env variable JWT_SECRET
- Token Expiration: 7 days
- Verification: Uses jsonwebtoken library
```

**Custom Types**:
```typescript
AuthenticatedRequest    // Optional user property
ProtectedRequest        // Required user property (post-middleware)
```

**Usage in Routes**:
```typescript
// Protected routes use authenticateToken middleware
router.get('/', authenticateToken, todoController.getTodos);
router.post('/', authenticateToken, todoController.createTodo);
```

#### Password Security

**Hash Function** (`hashPassword`):
- Uses bcrypt with 10 salt rounds
- Called during user registration
- Makes passwords cryptographically irreversible

**Verify Function** (`verifyPassword`):
- Compares plaintext with bcrypt hash
- Used during login validation
- Timing-safe comparison (prevents timing attacks)

#### Token Generation

**Function**: `generateToken()`
- Creates JWT with user ID, email, name
- 7-day expiration
- Signed with JWT_SECRET

### 1.3 Request Logger Middleware

**Location**: `backend/src/middleware/logger.ts`

#### Functionality

**Logs**:
- Request method (GET, POST, PUT, DELETE)
- Request path and query parameters
- Response status code
- Response time (in milliseconds)
- Request body for POST/PUT (first 100 chars)

**Status Code Colors** (for visual identification):
- ✅ 2xx - Success (green indicator)
- 🔀 3xx - Redirect (blue indicator)
- ❌ 4xx - Client Error (red indicator)
- 💥 5xx - Server Error (red indicator)

**Implementation**:
- Intercepts response using `res.send` override
- Calculates duration from request start
- Logs before response completes

### 1.4 Global Error Handler

**Location**: `backend/index.ts` (lines 107-123)

```typescript
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});
```

**Purpose**:
- Catches all unhandled errors from routes and middleware
- Logs errors to console
- Returns consistent error response to client
- Prevents server crashes from unhandled exceptions

---

## 2. TRANSACTION MANAGEMENT

### 2.1 TransactionManager Overview

**Location**: `backend/src/utils/TransactionManager.ts`

**Purpose**: Ensure database consistency and prevent race conditions

**Key Responsibilities**:
- Execute operations within database transactions
- Support multiple isolation levels
- Handle dependent/nested transactions with savepoints
- Implement automatic retry logic for deadlocks
- Manage transaction timeouts

### 2.2 Core Methods

#### `execute<T>(callback, isolationLevel?, context?)`

**Purpose**: Execute a callback within a single transaction

**Features**:
- Auto-rollback on errors
- Configurable isolation levels
- Optional context tracking for dependent transactions

**Usage Pattern**:
```typescript
await transactionManager.execute(
  async (queryRunner) => {
    const todoRepo = new TodoRepository(queryRunner.manager);
    return await todoRepo.create(text, userId);
  },
  'SERIALIZABLE'
);
```

**Error Handling**:
- Automatic rollback if callback throws
- Properly releases database connection
- Re-throws error to caller

#### `executeWithRetry<T>(callback, isolationLevel?)`

**Purpose**: Retry transaction on deadlock errors

**Features**:
- Exponential backoff (100ms, 200ms, 400ms, etc.)
- Detects deadlock errors by message/code
- Configurable retry attempts (default: 3)
- Useful for high-concurrency scenarios

**Example**:
```typescript
await transactionManager.executeWithRetry(
  async (queryRunner) => {
    // Operation that might deadlock
  },
  'SERIALIZABLE'
);
```

#### `executeDependent<T>(operations[], isolationLevel?)`

**Purpose**: Execute multiple dependent operations in single transaction

**Features**:
- All operations in ONE transaction (no race conditions)
- Sequential execution with single rollback point
- Each operation receives same queryRunner
- All succeed or all rollback

**Example**:
```typescript
const [user, todo] = await transactionManager.executeDependent([
  async (qr) => {
    // Step 1: Validate user
    const user = await userRepo.findById(userId);
    if (!user) throw new Error('User not found');
    return user;
  },
  async (qr) => {
    // Step 2: Create todo (only if Step 1 succeeds)
    return await todoRepo.create(text, userId);
  }
], 'SERIALIZABLE');
```

### 2.3 Isolation Levels

**Database Consistency Levels** (from least to most restrictive):

| Level | Risk Level | Performance | Best For |
|-------|-----------|-------------|----------|
| `READ_UNCOMMITTED` | Very High | Fastest | ❌ Not recommended |
| `READ_COMMITTED` | Medium | Good | Default, general reads |
| `REPEATABLE_READ` | Low | Medium | Financial operations |
| `SERIALIZABLE` | None | Slower | Critical operations, race condition prevention |

**Current Usage**:
- **Default Isolation**: `READ_COMMITTED`
- **All Service Operations**: `SERIALIZABLE` (most conservative)

**Why SERIALIZABLE for Services**:
```
Register: Prevents duplicate users
Login: Ensures data consistency
Create Todo: Validates user in same transaction
Update Todo: Prevents simultaneous updates
Delete Todo: Prevents deletion during read
```

### 2.4 Savepoints (Nested Transactions)

**Method**: `executeWithSavepoint<T>(callback, queryRunner)`

**Purpose**: Allow partial rollback within a transaction

**How It Works**:
1. Creates named savepoint
2. Executes operation
3. Releases savepoint on success
4. Rolls back to savepoint on error

**SQL Operations**:
```sql
SAVEPOINT sp_<timestamp>_<random>
-- Operation executes here
RELEASE SAVEPOINT sp_<timestamp>_<random>
-- OR on error:
ROLLBACK TO SAVEPOINT sp_<timestamp>_<random>
```

**Automatic Usage**: Called when nested transactions detected

### 2.5 Deadlock Detection

**Method**: `isDeadlockError(error)`

**Detects**:
- Error message containing "deadlock"
- Error message containing "wait-for graph"
- MySQL error code 1213

**Triggers**: Automatic retry with exponential backoff

---

## 3. SERVICE LAYER (Transaction Integration)

### 3.1 TodoService

**Location**: `backend/src/services/TodoService.ts`

**Pattern**: All methods wrap database operations in transactions

#### Private Transaction Wrapper
```typescript
private async executeTransaction<T>(
  operation: (todoRepo, userRepo) => Promise<T>
): Promise<T> {
  return this.transactionManager.execute(
    async (queryRunner) => {
      const todoRepository = new TodoRepository(queryRunner.manager);
      const userRepository = new UserRepository(queryRunner.manager);
      return await operation(todoRepository, userRepository);
    },
    'SERIALIZABLE'
  );
}
```

**Guarantees**:
- Same transaction context for all repositories
- User validation happens in same transaction as todo operation
- No race conditions between validation and creation

#### Service Methods
1. **getTodos()** - Fetches todos with filters and pagination
2. **getTodoById()** - Gets single todo by ID
3. **createTodo()** - Creates new todo with user validation
4. **updateTodo()** - Updates existing todo with authorization
5. **deleteTodo()** - Soft deletes todo (marks as DELETED)

**Safety Features**:
- User validation in same transaction
- Authorization checks within transaction
- Prevents deleted user from creating todos
- Atomic updates (all or nothing)

### 3.2 UserService

**Location**: `backend/src/services/UserService.ts`

**Transaction Wrapper** (identical pattern to TodoService):
```typescript
private async executeTransaction<T>(
  operation: (userRepo) => Promise<T>
): Promise<T> {
  return this.transactionManager.execute(
    async (queryRunner) => {
      const userRepository = new UserRepository(queryRunner.manager);
      return await operation(userRepository);
    },
    'SERIALIZABLE'
  );
}
```

#### Service Methods

**Register**:
- Validates email not already registered (in transaction)
- Prevents duplicate registrations
- Returns user + JWT token

**Login**:
- Validates email exists
- Compares password hash
- Returns user + JWT token

**GetUserById**:
- Fetches user profile
- Used for subsequent authorization checks

---

## 4. CONTROLLER LAYER

**Location**: `backend/src/controllers/todoController.ts` and `authController.ts`

**Responsibilities**:
- Parse request parameters
- Call service methods
- Handle service errors
- Return formatted responses

**Key Pattern**:
```typescript
async getTodos(req: ProtectedRequest, res: Response) {
  try {
    // User is GUARANTEED to exist (checked by middleware)
    const result = await todoService.getTodos(
      req.user.id,
      filters,
      pagination
    );
    res.status(200).json(result);
  } catch (error) {
    // Error from service (includes transaction rollback)
    res.status(500).json({ error: error.message });
  }
}
```

**Error Handling Hierarchy**:
1. Service throws error
2. Transaction automatically rollbacks
3. Controller catches and formats error
4. Response sent to client

---

## 5. ROUTE PROTECTION PATTERN

### 5.1 Protected Routes (Todo Routes)

**Location**: `backend/src/routes/todoRoutes.ts`

```typescript
// All routes protected with authenticateToken middleware
router.get('/', authenticateToken, todoController.getTodos);
router.get('/:id', authenticateToken, todoController.getTodoById);
router.post('/', authenticateToken, todoController.createTodo);
router.put('/:id', authenticateToken, todoController.updateTodo);
router.delete('/:id', authenticateToken, todoController.deleteTodo);
```

**Flow**:
1. Request arrives with Authorization header
2. `authenticateToken` middleware validates JWT
3. If valid → `req.user` populated, next() called
4. If invalid → 401/403 response, route handler not called
5. `ProtectedRequest` type guarantees `req.user` exists

### 5.2 Public Routes (Auth Routes)

**Location**: `backend/src/routes/authRoutes.ts`

```typescript
// No middleware - public endpoints
router.post('/register', authController.register);
router.post('/login', authController.login);
```

**Why No Middleware**:
- Registration: First-time users don't have tokens
- Login: Users don't have tokens yet
- Both endpoints validate input and prevent abuse via service layer

---

## 6. DATABASE OPERATIONS

### 6.1 TodoRepository

**Location**: `backend/src/repositories/TodoRepository.ts`

**Methods**:
- `find()` - Get todos with filtering and pagination
- `create()` - Create new todo
- `update()` - Update existing todo
- `delete()` - Soft delete (mark as DELETED)
- `exists()` - Check if todo exists

**Transaction Context**:
- Receives EntityManager from QueryRunner
- All operations use transaction context
- No independent queries outside transaction

### 6.2 UserRepository

**Location**: `backend/src/repositories/UserRepository.ts`

**Methods**:
- `findById()` - Get user by ID
- `findByEmail()` - Get user by email
- `create()` - Create new user
- `exists()` - Check if email registered

**Authorization Checks**:
- Validates user ownership of todos
- Prevents cross-user data access

---

## 7. DATABASE CONNECTION

**Location**: `backend/src/database/connection.ts`

**Configuration**:
```typescript
AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'todo_db',
  synchronize: process.env.NODE_ENV !== 'production',
  logging: true,
  entities: [User, Todo],
  migrations: ['src/migrations/*.ts']
});
```

**Features**:
- PostgreSQL database
- Automatic schema sync in development
- Query logging enabled
- Support for migrations

---

## 8. SECURITY CONSIDERATIONS

### 8.1 Authentication
- ✅ JWT tokens with 7-day expiration
- ✅ Bcrypt password hashing (10 rounds)
- ✅ Bearer token format validation
- ✅ Token verification with secret key

### 8.2 Authorization
- ✅ User isolation via userId checks
- ✅ Todo ownership validation
- ✅ Soft deletes preserve audit trail
- ✅ SERIALIZABLE isolation prevents race conditions

### 8.3 Data Protection
- ✅ Transactions ensure consistency
- ✅ Savepoints for nested operations
- ✅ Automatic rollback on errors
- ✅ Deadlock retry logic

### 8.4 Recommendations
- ⚠️ Use HTTPS in production
- ⚠️ Rotate JWT_SECRET regularly
- ⚠️ Enable database SSL connections
- ⚠️ Add rate limiting middleware
- ⚠️ Add request validation middleware (joi/zod)
- ⚠️ Monitor transaction logs for deadlocks

---

## 9. ERROR FLOW DIAGRAM

```
Request → Middleware Chain → Route Handler → Service
                                              ↓
                                         Transaction Start
                                              ↓
                                         Repository Operation
                                              ↓
                            Error? → Automatic Rollback → Throw
                                              ↓
                                         Transaction Commit
                                              ↓
                            Error? → Global Error Handler → Response
```

---

## 10. PERFORMANCE CONSIDERATIONS

### 10.1 Transaction Overhead
- **SERIALIZABLE Isolation**: Safest but slowest
- **Alternative**: Use READ_COMMITTED for reads, SERIALIZABLE for writes
- **Deadlock Retries**: Exponential backoff prevents thundering herd

### 10.2 Optimization Opportunities
1. **Query Optimization**: Add indexes on frequently filtered columns
2. **Connection Pooling**: Increase pool size for high concurrency
3. **Caching**: Cache user objects after login
4. **Lazy Loading**: Avoid loading unnecessary relations

### 10.3 Monitoring
- Log slow queries (> 100ms)
- Track transaction durations
- Monitor deadlock frequency
- Alert on retry exhaustion

---

## 11. QUICK REFERENCE GUIDE

### Adding New Protected Endpoint
```typescript
// 1. Add to controller
async newEndpoint(req: ProtectedRequest, res: Response) {
  const result = await service.operation(req.user.id);
  res.json(result);
}

// 2. Add route with authenticateToken
router.post('/path', authenticateToken, controller.newEndpoint);

// 3. Service already has transaction wrapper
```

### Adding Database Operation
```typescript
// Operations execute in transaction context automatically
const result = await queryRunner.manager.getRepository(Entity).save(data);
```

### Handling Concurrent Requests
```typescript
// Already handled by SERIALIZABLE isolation + transaction manager
// No race conditions by design
```

---

## 12. Dependencies

### Core Libraries
- **express**: HTTP server framework
- **cors**: Cross-origin request handling
- **typeorm**: Object-relational mapping
- **jsonwebtoken**: JWT token creation/verification
- **bcrypt**: Password hashing
- **dotenv**: Environment configuration

### Database
- **PostgreSQL**: Primary database
- **TypeORM QueryRunner**: Transaction management

---

## Conclusion

This backend implements a robust middleware and transaction system:

**Middleware Layers**:
- CORS for safe cross-origin requests
- JSON parsing for request bodies
- Request logging for observability
- Authentication for user verification
- Global error handling for reliability

**Transaction System**:
- SERIALIZABLE isolation for consistency
- Automatic rollback on errors
- Savepoint support for nested operations
- Deadlock retry logic for reliability
- Transaction context throughout request

**Result**: A secure, reliable, and observable API with data consistency guarantees.
