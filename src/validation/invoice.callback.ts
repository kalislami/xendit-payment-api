import { z } from 'zod';
export const invoiceCallbackSchema = z.object({
  id: z.string().min(1),
  external_id: z.string().min(1),
  status: z.enum(['PENDING', 'PAID', 'SETTLED', 'EXPIRED']),
  paid_at: z.string().datetime({ offset: true }).nullable().optional(),
});

export type InvoiceCallback = z.infer<typeof invoiceCallbackSchema>;
