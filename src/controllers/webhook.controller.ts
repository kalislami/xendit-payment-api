import { timingSafeEqual } from 'crypto';
import { RequestHandler } from 'express';
import { env } from '../config/env';
import { AppError } from '../errors';
import { applyInvoiceCallback } from '../services/payment.service';
import { invoiceCallbackSchema } from '../validation/invoice.callback';

export const verifyCallbackToken: RequestHandler = (req, _res, next) => {
  const actual = req.get('x-callback-token');
  const expected = Buffer.from(env.XENDIT_CALLBACK_TOKEN);
  const received = Buffer.from(actual ?? '');
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    next(new AppError(403, 'INVALID_CALLBACK_TOKEN', 'Invalid callback token'));
    return;
  }
  next();
};

export const handleInvoiceCallback: RequestHandler = async (req, res, next) => {
  try {
    const parsed = invoiceCallbackSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid callback payload');
    }
    await applyInvoiceCallback(parsed.data);
    res.json({ message: 'Ok' });
  } catch (error) {
    next(error);
  }
};
