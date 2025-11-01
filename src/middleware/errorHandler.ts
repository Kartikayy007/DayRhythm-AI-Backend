import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', error);

  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: (error as any).issues?.map((issue: any) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })) || [],
    });
    return;
  }

  // Check for Prisma errors by their name and code property
  if ('code' in error && typeof (error as any).code === 'string') {
    const code = (error as any).code;
    if (code === 'P2002') {
      res.status(409).json({
        error: 'Resource already exists',
        details: 'A record with this unique field already exists',
      });
      return;
    }

    if (code === 'P2025') {
      res.status(404).json({
        error: 'Resource not found',
      });
      return;
    }
  }

  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({ error: 'Token expired' });
    return;
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
};
