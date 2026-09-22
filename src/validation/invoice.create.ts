import { z } from 'zod';
export const createInvoiceSchema = z.object({
  external_id: z.string().trim().min(1),
  amount: z.number().int().positive().finite().max(2147483647),
  payer_email: z.string().email(),
  description: z.string().trim().min(1),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
