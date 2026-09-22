import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  XENDIT_SECRET_KEY: z.string().min(1),
  XENDIT_CALLBACK_TOKEN: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  PAYMENT_SUCCESS_REDIRECT_URL: z.preprocess(
    value => value === '' ? undefined : value,
    z.string().url().optional(),
  ),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.issues.map(issue => issue.path.join('.')).join(', ')}`);
}

export const env = parsed.data;
