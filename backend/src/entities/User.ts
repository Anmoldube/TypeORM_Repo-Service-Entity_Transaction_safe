// Import TypeORM decorators for entity definition
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
// Import Todo entity for defining relationship
import { Todo } from './Todo.ts';

// ========== USER ENTITY ==========
/**
 * User entity representing a user account in the system
 * Stores user authentication credentials and metadata
 */
@Entity()
export class User {
  // Auto-incrementing primary key that uniquely identifies each user
  @PrimaryGeneratedColumn()
  id: number | undefined;

  // Email address - must be unique in database, used for login
  @Column({ type: 'varchar', unique: true })
  email: string | undefined;

  // Bcrypt hashed password for authentication
  @Column({ type: 'varchar' })
  password: string | undefined;

  // Optional user display name
  @Column({ type: 'varchar', nullable: true })
  name: string | null | undefined;

  // One-to-many relationship: one user can have multiple todos
  // cascade: true means deleting user also deletes their todos
  // onDelete: 'CASCADE' ensures database-level cascading delete
  @OneToMany(() => Todo, (todo) => todo.author, { cascade: true, onDelete: 'CASCADE' })
  todos: Todo[] | undefined;

  // Automatically set timestamp when user record is created
  @CreateDateColumn()
  createdAt: Date | undefined;

  // Automatically updated timestamp whenever user record is modified
  @UpdateDateColumn()
  updatedAt: Date | undefined;
}
