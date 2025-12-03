import { User } from 'firebase/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export interface Todo {
  id: number;
  text: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DELETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate?: string;
  authorId: number;
  createdAt: string;
  updatedAt: string;
}

export interface TodoFilters {
  status?: string;
  priority?: string;
  dueDate?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedTodos {
  todos: Todo[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class ApiService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  async getTodos(filters: TodoFilters = {}): Promise<PaginatedTodos> {
    const headers = this.getAuthHeaders();
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await fetch(`${API_BASE_URL}/api/todos?${params}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch todos');
    }

    return response.json();
  }

  async createTodo(todoData: {
    text: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    dueDate?: string;
  }): Promise<{ todo: Todo }> {
    const headers = this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/todos`, {
      method: 'POST',
      headers,
      body: JSON.stringify(todoData),
    });

    if (!response.ok) {
      throw new Error('Failed to create todo');
    }

    return response.json();
  }

  async updateTodo(id: number, updates: Partial<{
    text: string;
    status: 'ACTIVE' | 'COMPLETED' | 'DELETED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    dueDate: string | null;
  }>): Promise<{ todo: Todo }> {
    const headers = this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/todos/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update todo');
    }

    return response.json();
  }

  async deleteTodo(id: number): Promise<void> {
    const headers = this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/todos/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to delete todo');
    }
  }
}

export const apiService = new ApiService();