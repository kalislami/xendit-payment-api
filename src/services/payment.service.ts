import { prisma } from './prisma.service';
import { AppError } from '../errors';
import { InvoiceCallback } from '../validation/invoice.callback';
import { CreateInvoiceInput } from '../validation/invoice.create';
import { Prisma } from '../generated/prisma';
import * as xendit from './xendit.service';

function statusGuard(incoming: string): Prisma.InvoiceWhereInput {
  if (incoming === 'PENDING') return { status: { notIn: ['PAID', 'SETTLED', 'EXPIRED'] } };
  if (incoming === 'EXPIRED') return { status: { notIn: ['PAID', 'SETTLED'] } };
  if (incoming === 'PAID') return { status: { not: 'SETTLED' } };
  return {};
}

export async function createPayment(input: CreateInvoiceInput) {
  const existing = await prisma.invoice.findUnique({ where: { externalId: input.external_id } });
  if (existing) {
    throw new AppError(409, 'DUPLICATE_EXTERNAL_ID', 'Invoice with this external ID already exists');
  }

  const invoice = await xendit.createInvoice(input);
  if (invoice.external_id !== input.external_id || invoice.amount !== input.amount) {
    throw new AppError(502, 'XENDIT_REQUEST_FAILED', 'Invalid payment provider response');
  }

  try {
    await prisma.invoice.create({
      data: {
        id: invoice.id,
        externalId: invoice.external_id,
        amount: invoice.amount,
        status: invoice.status,
        payerEmail: input.payer_email,
        description: input.description,
        invoiceUrl: invoice.invoice_url,
        paidAt: invoice.paid_at ? new Date(invoice.paid_at) : null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(409, 'DUPLICATE_EXTERNAL_ID', 'Invoice with this external ID already exists');
    }
    throw error;
  }

  return {
    id: invoice.id,
    external_id: invoice.external_id,
    invoice_url: invoice.invoice_url,
    status: invoice.status,
    available_banks: invoice.available_banks ?? [],
  };
}

export async function getPaymentStatus(id: string) {
  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'INVOICE_NOT_FOUND', 'Invoice not found');

  const invoice = await xendit.getInvoiceStatus(id);
  if (invoice.id !== id || invoice.external_id !== existing.externalId) {
    throw new AppError(502, 'XENDIT_REQUEST_FAILED', 'Invalid payment provider response');
  }

  const result = await prisma.invoice.updateMany({
    where: { id, externalId: existing.externalId, ...statusGuard(invoice.status) },
    data: {
      status: invoice.status,
      ...(['PAID', 'SETTLED'].includes(invoice.status) && invoice.paid_at
        ? { paidAt: new Date(invoice.paid_at) } : {}),
    },
  });
  const current = result.count === 0
    ? await prisma.invoice.findUnique({ where: { id } }) : null;
  if (result.count === 0 && !current) {
    throw new AppError(404, 'INVOICE_NOT_FOUND', 'Invoice not found');
  }
  const status = current?.status ?? invoice.status;
  const paidAt = current?.paidAt ?? (['PAID', 'SETTLED'].includes(status) && invoice.paid_at
    ? new Date(invoice.paid_at) : existing.paidAt);

  return {
    id,
    status,
    paid_at: paidAt?.toISOString() ?? null,
    amount: existing.amount,
    invoice_url: existing.invoiceUrl,
  };
}

export async function applyInvoiceCallback(payload: InvoiceCallback): Promise<void> {
  const existing = await prisma.invoice.findUnique({ where: { id: payload.id } });
  if (!existing || existing.externalId !== payload.external_id) {
    throw new AppError(404, 'INVOICE_NOT_FOUND', 'Invoice not found');
  }

  // A late PENDING callback must not reverse a completed payment.
  if ((payload.status === 'PENDING' && ['PAID', 'SETTLED', 'EXPIRED'].includes(existing.status)) ||
      (payload.status === 'EXPIRED' && ['PAID', 'SETTLED'].includes(existing.status)) ||
      (payload.status === 'PAID' && existing.status === 'SETTLED')) {
    return;
  }

  const result = await prisma.invoice.updateMany({
    where: { id: payload.id, externalId: payload.external_id, ...statusGuard(payload.status) },
    data: {
      status: payload.status,
      ...(['PAID', 'SETTLED'].includes(payload.status) && payload.paid_at ? { paidAt: new Date(payload.paid_at) } : {}),
    },
  });
  if (result.count === 0 && !await prisma.invoice.findUnique({ where: { id: payload.id } })) {
    throw new AppError(404, 'INVOICE_NOT_FOUND', 'Invoice not found');
  }
}
