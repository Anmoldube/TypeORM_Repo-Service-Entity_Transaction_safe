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

export interface TodoResponse {
    todos: Todo[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export interface CreateTodoRequest {
    text: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    dueDate?: string;
}

export interface UpdateTodoRequest {
    text?: string;
    status?: 'ACTIVE' | 'COMPLETED' | 'DELETED';
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    dueDate?: string | null;
}

class ApiService {
    private baseURL: string;

    constructor() {
        this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    } private getAuthToken(): string {
        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('No authentication token found');
        }
        return token;
    }

    private async request<T>(
        method: string,
        endpoint: string,
        body?: any,
        requiresAuth: boolean = true
    ): Promise<T> {
        const url = `${this.baseURL}${endpoint}`;
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (requiresAuth) {
            headers['Authorization'] = `Bearer ${this.getAuthToken()}`;
        }

        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
    }

    // Auth endpoints
    async register(email: string, password: string, name?: string): Promise<{ user: any; token: string }> {
        return this.request(
            'POST',
            '/api/auth/register',
            { email, password, name },
            false
        );
    }

    async login(email: string, password: string): Promise<{ user: any; token: string }> {
        return this.request(
            'POST',
            '/api/auth/login',
            { email, password },
            false
        );
    }

    // Todo endpoints
    async getTodos(filters?: TodoFilters): Promise<TodoResponse> {
        const queryParams = new URLSearchParams();

        if (filters) {
            if (filters.status) queryParams.append('status', filters.status);
            if (filters.priority) queryParams.append('priority', filters.priority);
            if (filters.dueDate) queryParams.append('dueDate', filters.dueDate);
            if (filters.page) queryParams.append('page', filters.page.toString());
            if (filters.limit) queryParams.append('limit', filters.limit.toString());
        }

        const queryString = queryParams.toString();
        const endpoint = queryString ? `/api/todos?${queryString}` : '/api/todos';

        return this.request('GET', endpoint);
    }

    async getTodoById(id: number): Promise<{ todo: Todo }> {
        return this.request('GET', `/api/todos/${id}`);
    }

    async createTodo(todoData: CreateTodoRequest): Promise<{ todo: Todo }> {
        return this.request('POST', '/api/todos', todoData);
    }

    async updateTodo(id: number, updates: UpdateTodoRequest): Promise<{ todo: Todo }> {
        return this.request('PUT', `/api/todos/${id}`, updates);
    }

    async deleteTodo(id: number): Promise<{ message: string }> {
        return this.request('DELETE', `/api/todos/${id}`);
    }

    // Database status endpoint
    async checkDatabaseStatus(): Promise<{ status: string; database: string; timestamp: string; message?: string }> {
        return this.request(
            'GET',
            '/api/db-status',
            undefined,
            false
        );
    }

    // Health check endpoint
    async getHealthStatus(): Promise<{ status: string; timestamp: string }> {
        return this.request(
            'GET',
            '/api/health',
            undefined,
            false
        );
    }
}

export const apiService = new ApiService();
