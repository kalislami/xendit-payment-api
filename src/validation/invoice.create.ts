import { z } from 'zod';
import { validate } from './validate';

const schemaCreateInvoice = z.object({
  external_id: z.string(),
  amount: z.number(),
  payer_email: z.string().email(),
  description: z.string()
});

export const validationCreateInvoice = (reqBody: unknown) => {
  return validate(schemaCreateInvoice, reqBody);
};
