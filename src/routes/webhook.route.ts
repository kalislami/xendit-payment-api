import { Router } from 'express';
import { prisma } from '../services/prisma.service';
import { InvoiceResponse } from '../types/invoice';
import { validationInvoiceCallback } from '../validation/invoice.callback';

const router = Router();

const CALLBACK_SECRET = process.env.XENDIT_CALLBACK_TOKEN;

router.post('/invoice-callback', async (req, res) => {
  if (req.headers['x-callback-token'] !== CALLBACK_SECRET) {
    res.status(403).json({ error: 'Invalid token' });
    return
  }

  const { isValid, error, validData } = validationInvoiceCallback(req.body);

  if (!isValid) {
    res.status(400).json({ error });
    return
  }

  const payload = validData as InvoiceResponse;

  try {
    await prisma.invoice.upsert({
      where: { id: payload.id },
      update: {
        status: payload.status,
        paidAt: payload.status === 'PAID' && payload.paid_at ? new Date(payload.paid_at) : null,
      },
      create: {
        id: payload.id,
        externalId: payload.external_id,
        status: payload.status,
        amount: payload.amount,
        payerEmail: payload.payer_email,
        description: payload.description,
        invoiceUrl: payload.invoice_url,
        paidAt: payload.status === 'PAID' && payload.paid_at ? new Date(payload.paid_at) : null,
      },
    });

    res.json({ message: 'Ok' });
  } catch (error: any) {
    console.error('Error callback invoice:', error.response?.data ?? error.message ?? error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
