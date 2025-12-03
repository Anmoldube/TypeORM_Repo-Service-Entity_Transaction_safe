import React from 'react';
import { Todo } from '../services/api';
import { TodoItem } from './TodoItem';

interface TodoListProps {
  todos: Todo[];
  onUpdate: (id: number, updates: Partial<Todo>) => void;
  onDelete: (id: number) => void;
  onEdit: (todo: Todo) => void;
}

export const TodoList: React.FC<TodoListProps> = ({ todos, onUpdate, onDelete, onEdit }) => {
  if (todos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400 text-lg">No todos found. Create your first todo!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
};