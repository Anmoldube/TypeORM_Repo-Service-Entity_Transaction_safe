// Import TypeORM decorators for entity definition
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
// Import User entity for defining relationship
import { User } from './User.ts';

// ========== ENUMS FOR TODO STATUS AND PRIORITY ==========
/**
 * TodoStatus enum defines the current state of a todo item
 */
export enum TodoStatus {
  // Todo is not yet completed
  ACTIVE = 'ACTIVE',
  // Todo has been marked as done
  COMPLETED = 'COMPLETED',
  // Todo is marked as deleted (soft delete)
  DELETED = 'DELETED',
}

/**
 * Priority enum defines the importance/urgency of a todo item
 */
export enum Priority {
  // Low importance task
  LOW = 'LOW',
  // Medium importance task
  MEDIUM = 'MEDIUM',
  // High importance/urgent task
  HIGH = 'HIGH',
}

// ========== TODO ENTITY ==========
/**
 * Todo entity representing a task/todo item in the system
 * Each todo belongs to a user and can have various attributes
 */
@Entity()
export class Todo {
  // Auto-incrementing primary key that uniquely identifies each todo
  @PrimaryGeneratedColumn()
  id: number | undefined;

  // Text content/description of the todo item
  @Column({ type: 'varchar' })
  text: string | undefined;

  // Current status of the todo (ACTIVE, COMPLETED, or DELETED)
  // Default status is ACTIVE when a new todo is created
  @Column({ type: 'enum', enum: TodoStatus, default: TodoStatus.ACTIVE })
  status: TodoStatus | undefined;

  // Priority level of the todo (LOW, MEDIUM, or HIGH)
  // Default priority is MEDIUM when a new todo is created
  @Column({ type: 'enum', enum: Priority, default: Priority.MEDIUM })
  priority: Priority | undefined;

  // Optional due date for the todo (can be null if no deadline)
  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date | null | undefined;

  // Foreign key referencing the User who created this todo
  @Column({ type: 'integer' })
  authorId: number | undefined;

  // Many-to-one relationship: multiple todos belong to one user
  // onDelete: 'CASCADE' ensures todos are deleted when user is deleted
  @ManyToOne(() => User, (user) => user.todos, { onDelete: 'CASCADE' })
  author: User | undefined;

  // Automatically set timestamp when todo record is created
  @CreateDateColumn()
  createdAt: Date | undefined;

  // Automatically updated timestamp whenever todo record is modified
  @UpdateDateColumn()
  updatedAt: Date | undefined;
}
