import axios from 'axios';
import { z } from 'zod';
import { env } from '../config/env';
import { AppError } from '../errors';
import { CreateInvoiceInput } from '../validation/invoice.create';

const baseUrl = 'https://api.xendit.co/v2/invoices';
const invoiceSchema = z.object({
  id: z.string().min(1),
  external_id: z.string().min(1),
  amount: z.number().int().positive().max(2147483647),
  status: z.enum(['PENDING', 'PAID', 'SETTLED', 'EXPIRED']),
  invoice_url: z.string().url().nullable().optional(),
  paid_at: z.string().datetime({ offset: true }).nullable().optional(),
  available_banks: z.array(z.unknown()).optional(),
});

export type XenditInvoice = z.infer<typeof invoiceSchema>;
const createdInvoiceSchema = invoiceSchema.extend({ invoice_url: z.string().url() });
export type CreatedXenditInvoice = z.infer<typeof createdInvoiceSchema>;

const requestOptions = () => ({
  auth: { username: env.XENDIT_SECRET_KEY, password: '' },
  timeout: 10_000,
});

function translateError(error: unknown, lookup: boolean): never {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (lookup && status === 404) throw new AppError(404, 'INVOICE_NOT_FOUND', 'Invoice not found');
    if (status === 429) throw new AppError(503, 'XENDIT_REQUEST_FAILED', 'Payment provider is temporarily unavailable');
    throw new AppError(502, 'XENDIT_REQUEST_FAILED', 'Payment provider request failed');
  }
  throw error;
}

function parseInvoice<T extends z.ZodTypeAny>(data: unknown, schema: T): z.infer<T> {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new AppError(502, 'XENDIT_REQUEST_FAILED', 'Invalid payment provider response');
  }
  return parsed.data;
}

export async function createInvoice(payload: CreateInvoiceInput): Promise<CreatedXenditInvoice> {
  try {
    const response = await axios.post(baseUrl, {
      ...payload,
      currency: 'IDR',
      expiration_date: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      ...(env.PAYMENT_SUCCESS_REDIRECT_URL ? { success_redirect_url: env.PAYMENT_SUCCESS_REDIRECT_URL } : {}),
    }, requestOptions());
    return parseInvoice(response.data, createdInvoiceSchema);
  } catch (error) {
    return translateError(error, false);
  }
}

export async function getInvoiceStatus(id: string): Promise<XenditInvoice> {
  try {
    const response = await axios.get(`${baseUrl}/${encodeURIComponent(id)}`, requestOptions());
    return parseInvoice(response.data, invoiceSchema);
  } catch (error) {
    return translateError(error, true);
  }
}
