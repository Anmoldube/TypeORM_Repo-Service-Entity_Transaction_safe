import type { Response } from 'express';
import type { ProtectedRequest } from '../middleware/auth.ts';
import { TodoService } from '../services/TodoService.ts';
import { AppDataSource } from '../database/connection.ts';
import { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants.ts';

const todoService = new TodoService(AppDataSource);

export const todoController = {
    async getTodos(req: ProtectedRequest, res: Response) {
        try {
            // User is GUARANTEED to exist (checked by authenticateToken middleware at gate)
            const { status, priority, dueDate, page = '1', limit = '10' } = req.query;

            const result = await todoService.getTodos(
                req.user.id,
                {
                    status: status as any,
                    priority: priority as any,
                    dueDate: dueDate as string | undefined,
                },
                {
                    page: parseInt(page as string),
                    limit: parseInt(limit as string),
                }
            );

            return res.status(HTTP_STATUS.OK).json(result);
        } catch (error) {
            console.error('Get todos error:', error);
            const message = error instanceof Error ? error.message : ERROR_MESSAGES.FETCH_TODOS_FAILED;

            if (message === ERROR_MESSAGES.USER_NOT_FOUND) {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ error: message });
            }
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                error: ERROR_MESSAGES.FETCH_TODOS_FAILED,
            });
        }
    },

    async getTodoById(req: ProtectedRequest, res: Response) {
        try {
            // User is GUARANTEED to exist (checked by authenticateToken middleware at gate)
            const { id } = req.params;
            const todo = await todoService.getTodoById(parseInt(id), req.user.id);

            return res.status(HTTP_STATUS.OK).json({ todo });
        } catch (error) {
            console.error('Get todo error:', error);
            const message = error instanceof Error ? error.message : ERROR_MESSAGES.FETCH_TODOS_FAILED;

            if (message === ERROR_MESSAGES.USER_NOT_FOUND || message === ERROR_MESSAGES.TODO_NOT_FOUND) {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ error: message });
            }
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                error: ERROR_MESSAGES.FETCH_TODOS_FAILED,
            });
        }
    },

    async createTodo(req: ProtectedRequest, res: Response) {
        try {
            // User is GUARANTEED to exist (checked by authenticateToken middleware at gate)
            const { text, priority, dueDate } = req.body;
            const todo = await todoService.createTodo(text, req.user.id, priority, dueDate);

            return res.status(HTTP_STATUS.CREATED).json({ todo });
        } catch (error) {
            console.error('Create todo error:', error);
            const message = error instanceof Error ? error.message : ERROR_MESSAGES.CREATE_TODO_FAILED;

            if (message === ERROR_MESSAGES.TODO_TEXT_REQUIRED) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: message });
            }
            if (message === ERROR_MESSAGES.USER_NOT_FOUND) {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ error: message });
            }
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                error: ERROR_MESSAGES.CREATE_TODO_FAILED,
            });
        }
    },

    async updateTodo(req: ProtectedRequest, res: Response) {
        try {
            // User is GUARANTEED to exist (checked by authenticateToken middleware at gate)
            const { id } = req.params;
            const { text, status, priority, dueDate } = req.body;
            const todo = await todoService.updateTodo(parseInt(id), req.user.id, {
                text,
                status,
                priority,
                dueDate,
            });

            return res.status(HTTP_STATUS.OK).json({ todo });
        } catch (error) {
            console.error('Update todo error:', error);
            const message = error instanceof Error ? error.message : ERROR_MESSAGES.UPDATE_TODO_FAILED;

            if (message === ERROR_MESSAGES.USER_NOT_FOUND || message === ERROR_MESSAGES.TODO_NOT_FOUND) {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ error: message });
            }
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                error: ERROR_MESSAGES.UPDATE_TODO_FAILED,
            });
        }
    },

    async deleteTodo(req: ProtectedRequest, res: Response) {
        try {
            // User is GUARANTEED to exist (checked by authenticateToken middleware at gate)
            const { id } = req.params;
            await todoService.deleteTodo(parseInt(id), req.user.id);

            return res.status(HTTP_STATUS.OK).json({
                message: SUCCESS_MESSAGES.TODO_DELETED,
            });
        } catch (error) {
            console.error('Delete todo error:', error);
            const message = error instanceof Error ? error.message : ERROR_MESSAGES.DELETE_TODO_FAILED;

            if (message === ERROR_MESSAGES.USER_NOT_FOUND || message === ERROR_MESSAGES.TODO_NOT_FOUND) {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ error: message });
            }
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                error: ERROR_MESSAGES.DELETE_TODO_FAILED,
            });
        }
    },
};
