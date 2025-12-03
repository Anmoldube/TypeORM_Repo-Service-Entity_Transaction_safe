import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { apiService, Todo, TodoFilters } from '../services/api';
import { TodoForm } from './TodoForm';
import { TodoList } from './TodoList';
import { TodoFilters as TodoFiltersComponent } from './TodoFilters';
import { Modal } from './Modal';
import { ProfileDropdown } from './ProfileDropdown';

export const TodoApp: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess } = useToast();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TodoFilters>({});
  const [showForm, setShowForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  const loadTodos = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await apiService.getTodos(filters);
      setTodos(response.todos);
    } catch (error) {
      console.error('Failed to load todos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodos();
  }, [user, filters]);

  const handleCreateTodo = async (todoData: {
    text: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    dueDate?: string;
  }) => {
    if (!user) return;

    try {
      await apiService.createTodo(todoData);
      await loadTodos();
      setShowForm(false);
      showSuccess('Todo created successfully!');
    } catch (error) {
      console.error('Failed to create todo:', error);
    }
  };

  const handleCloseModal = () => {
    setShowForm(false);
    setEditingTodo(null);
  };

  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo);
  };

  const handleUpdateTodoSubmit = async (todoData: {
    text: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    dueDate?: string;
  }) => {
    if (!user || !editingTodo) return;

    try {
      await apiService.updateTodo(editingTodo.id, todoData);
      await loadTodos();
      setEditingTodo(null);
      showSuccess('Todo updated successfully!');
    } catch (error) {
      console.error('Failed to update todo:', error);
    }
  };

  const handleUpdateTodo = async (id: number, updates: Partial<Todo>) => {
    if (!user) return;

    try {
      await apiService.updateTodo(id, updates);
      await loadTodos();
      showSuccess('Todo updated successfully!');
    } catch (error) {
      console.error('Failed to update todo:', error);
    }
  };

  const handleDeleteTodo = async (id: number) => {
    if (!user) return;

    try {
      await apiService.deleteTodo(id);
      await loadTodos();
      showSuccess('Todo deleted successfully!');
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };



  return (
    <div className="min-h-screen">
      <header className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-white">My ToDos</h1>
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <TodoFiltersComponent
              filters={filters}
              onFiltersChange={setFilters}
            />
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              Add Todo
            </button>
          </div>



          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <TodoList
              todos={todos}
              onUpdate={handleUpdateTodo}
              onDelete={handleDeleteTodo}
              onEdit={handleEditTodo}
            />
          )}
        </div>
      </main>

      {/* Add Todo Modal */}
      <Modal
        isOpen={showForm && !editingTodo}
        onClose={handleCloseModal}
        title="Add New Todo"
      >
        <TodoForm
          onSubmit={handleCreateTodo}
          onCancel={handleCloseModal}
        />
      </Modal>

      {/* Edit Todo Modal */}
      <Modal
        isOpen={!!editingTodo}
        onClose={handleCloseModal}
        title="Edit Todo"
      >
        <TodoForm
          onSubmit={handleUpdateTodoSubmit}
          onCancel={handleCloseModal}
          initialData={editingTodo ? {
            text: editingTodo.text,
            priority: editingTodo.priority,
            dueDate: editingTodo.dueDate
          } : undefined}
        />
      </Modal>
    </div>
  );
};