import { RequestHandler } from 'express';
import { AppError } from '../errors';
import { createPayment, getPaymentStatus } from '../services/payment.service';
import { createInvoiceSchema } from '../validation/invoice.create';

export const createInvoice: RequestHandler = async (req, res, next) => {
  try {
    const parsed = createInvoiceSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid invoice request');
    res.status(201).json(await createPayment(parsed.data));
  } catch (error) {
    next(error);
  }
};

export const getInvoiceStatus: RequestHandler = async (req, res, next) => {
  try {
    if (!req.params.id?.trim()) throw new AppError(400, 'VALIDATION_ERROR', 'Invoice ID is required');
    res.json(await getPaymentStatus(req.params.id));
  } catch (error) {
    next(error);
  }
};
