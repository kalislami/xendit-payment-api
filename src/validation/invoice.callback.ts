import { z } from 'zod';
import { validate } from './validate';

const schemaInvoiceCallback = z.object({
  id: z.string().min(1),
  external_id: z.string().min(1),
  amount: z.number().optional().default(0),
  status: z.string().min(1),
  payer_email: z.string().email().optional().default("user@mail.co"),
  description: z.string().optional().default(""),
  invoice_url: z.string().url().optional().default("http://invoice_url"),
  paid_at: z.string().datetime().nullable(),
});

export const validationInvoiceCallback = (reqBody: unknown) => {
  return validate(schemaInvoiceCallback, reqBody);
};
