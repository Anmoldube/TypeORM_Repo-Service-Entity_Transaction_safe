import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import type { Request, Response, NextFunction } from 'express';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    name?: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; name?: string };
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (user: { id: number; email: string; name?: string }): string => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};