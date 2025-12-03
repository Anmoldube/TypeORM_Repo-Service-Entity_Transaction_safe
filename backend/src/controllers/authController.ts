import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.ts';
import { UserService } from '../services/UserService.ts';
import { AppDataSource } from '../database/connection.ts';
import { HTTP_STATUS, ERROR_MESSAGES } from '../utils/constants.ts';

const userService = new UserService(AppDataSource);

export const authController = {
    async register(req: AuthenticatedRequest, res: Response) {
        try {
            const { email, password, name } = req.body;
            const result = await userService.register(email, password, name);

            return res.status(HTTP_STATUS.CREATED).json(result);
        } catch (error) {
            console.error('Registration error:', error);
            const message = error instanceof Error ? error.message : ERROR_MESSAGES.REGISTRATION_FAILED;

            if (message === ERROR_MESSAGES.USER_EXISTS) {
                return res.status(HTTP_STATUS.CONFLICT).json({ error: message });
            }
            if (message === ERROR_MESSAGES.EMAIL_PASSWORD_REQUIRED) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: message });
            }
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                error: ERROR_MESSAGES.REGISTRATION_FAILED,
            });
        }
    },

    async login(req: AuthenticatedRequest, res: Response) {
        try {
            const { email, password } = req.body;
            const result = await userService.login(email, password);

            return res.status(HTTP_STATUS.OK).json(result);
        } catch (error) {
            console.error('Login error:', error);
            const message = error instanceof Error ? error.message : ERROR_MESSAGES.LOGIN_FAILED;

            if (message === ERROR_MESSAGES.INVALID_CREDENTIALS || message === ERROR_MESSAGES.EMAIL_PASSWORD_REQUIRED) {
                return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: message });
            }
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                error: ERROR_MESSAGES.LOGIN_FAILED,
            });
        }
    },
};
