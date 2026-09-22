import { ErrorRequestHandler } from 'express';
import { AppError } from '../errors';
import { Prisma } from '../generated/prisma';

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON request body' } });
    return;
  }
  if (error instanceof AppError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientInitializationError) {
    console.error('Database request failed');
    res.status(500).json({ error: { code: 'DATABASE_ERROR', message: 'Database request failed' } });
    return;
  }

  console.error('Unhandled request error', error instanceof Error ? error.name : typeof error);
  res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } });
};
