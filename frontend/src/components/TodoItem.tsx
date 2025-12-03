import React, { useState } from 'react';
import { Todo } from '../services/api';

interface TodoItemProps {
  todo: Todo;
  onUpdate: (id: number, updates: Partial<Todo>) => void;
  onDelete: (id: number) => void;
  onEdit: (todo: Todo) => void;
}

export const TodoItem: React.FC<TodoItemProps> = ({ todo, onUpdate, onDelete, onEdit }) => {

  const handleToggleComplete = () => {
    const newStatus = todo.status === 'COMPLETED' ? 'ACTIVE' : 'COMPLETED';
    onUpdate(todo.id, { status: newStatus });
  };

  const handleEdit = () => {
    onEdit(todo);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this todo?')) {
      onDelete(todo.id);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-500/20 text-red-300 border border-red-500/30';
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
      case 'LOW':
        return 'bg-green-500/20 text-green-300 border border-green-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border border-slate-500/30';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString();
  };

  const isOverdue = () => {
    if (!todo.dueDate || todo.status === 'COMPLETED') return false;
    return new Date(todo.dueDate) < new Date();
  };

  return (
    <div className={`bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-6 ${todo.status === 'COMPLETED' ? 'opacity-60' : ''} transition-all duration-200`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          <input
            type="checkbox"
            checked={todo.status === 'COMPLETED'}
            onChange={handleToggleComplete}
            className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-white/20 rounded bg-white/5"
          />

          <div className="flex-1">
            <p className={`text-white text-lg ${todo.status === 'COMPLETED' ? 'line-through' : ''}`}>
              {todo.text}
            </p>

            <div className="flex items-center space-x-3 mt-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(todo.priority)}`}>
                {todo.priority}
              </span>

              {todo.dueDate && (
                <span className={`text-sm ${isOverdue() ? 'text-red-400 font-medium' : 'text-slate-400'}`}>
                  Due: {formatDate(todo.dueDate)}
                  {isOverdue() && ' (Overdue)'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleEdit}
            className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors duration-200"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors duration-200"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};