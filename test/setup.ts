process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.XENDIT_SECRET_KEY = 'test-secret';
process.env.XENDIT_CALLBACK_TOKEN = 'test-callback-token';

// Replace Prisma before the application modules are loaded. No test opens a real DB connection.
const mockRequire = require('mock-require');
const unavailable = async () => { throw new Error('Prisma method was not stubbed'); };
mockRequire(require.resolve('../src/services/prisma.service'), {
  prisma: { invoice: { findUnique: unavailable, create: unavailable, updateMany: unavailable } },
});
