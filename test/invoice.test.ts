import assert from 'node:assert/strict';
import axios from 'axios';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../src/app';
import { prisma } from '../src/services/prisma.service';
import * as xendit from '../src/services/xendit.service';
import { Prisma } from '../src/generated/prisma';

const request = supertest(app);
const input = { external_id: 'order-1', amount: 55000, payer_email: 'test@example.com', description: 'Order 1' };
const invoice = {
  id: 'inv-1', ...input, status: 'PENDING' as const, invoice_url: 'https://checkout.example.com/1',
  paid_at: null, available_banks: [],
};
const local = {
  id: invoice.id, externalId: input.external_id, amount: input.amount, status: 'PENDING',
  payerEmail: input.payer_email, description: input.description, invoiceUrl: invoice.invoice_url,
  paidAt: null, createdAt: new Date(),
};

describe('POST /api/payments/create-invoice', () => {
  afterEach(() => sinon.restore());

  it('creates and persists a valid invoice', async () => {
    sinon.stub(prisma.invoice, 'findUnique').resolves(null);
    const upstream = sinon.stub(xendit, 'createInvoice').resolves(invoice);
    const create = sinon.stub(prisma.invoice, 'create').resolves(local);
    const res = await request.post('/api/payments/create-invoice').send(input);
    assert.equal(res.status, 201);
    assert.equal(res.body.external_id, input.external_id);
    assert.equal(res.body.invoice_url, invoice.invoice_url);
    assert.equal(upstream.callCount, 1);
    assert.equal(create.firstCall.args[0].data.externalId, input.external_id);
  });

  for (const invalid of [
    { amount: 0 }, { amount: -1 }, { amount: 1.5 },
    { external_id: '' }, { payer_email: 'invalid' }, { description: '  ' },
  ]) {
    it(`rejects invalid input ${JSON.stringify(invalid)}`, async () => {
      const upstream = sinon.stub(xendit, 'createInvoice');
      const res = await request.post('/api/payments/create-invoice').send({ ...input, ...invalid });
      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
      assert.equal(upstream.callCount, 0);
    });
  }

  it('rejects an existing external ID before contacting Xendit', async () => {
    sinon.stub(prisma.invoice, 'findUnique').resolves(local);
    const upstream = sinon.stub(xendit, 'createInvoice');
    const res = await request.post('/api/payments/create-invoice').send(input);
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'DUPLICATE_EXTERNAL_ID');
    assert.equal(upstream.callCount, 0);
  });

  it('handles a unique constraint race as conflict', async () => {
    sinon.stub(prisma.invoice, 'findUnique').resolves(null);
    sinon.stub(xendit, 'createInvoice').resolves(invoice);
    sinon.stub(prisma.invoice, 'create').rejects(new Prisma.PrismaClientKnownRequestError('Unique', {
      code: 'P2002', clientVersion: '6.7.0', meta: { target: ['externalId'] },
    }));
    const res = await request.post('/api/payments/create-invoice').send(input);
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'DUPLICATE_EXTERNAL_ID');
  });

  it('does not expose an upstream error', async () => {
    sinon.stub(prisma.invoice, 'findUnique').resolves(null);
    sinon.stub(xendit, 'createInvoice').rejects(new Error('secret upstream details'));
    const res = await request.post('/api/payments/create-invoice').send(input);
    assert.equal(res.status, 500);
    assert.equal(res.body.error.code, 'INTERNAL_SERVER_ERROR');
    assert.ok(!JSON.stringify(res.body).includes('secret'));
  });

  it('maps a Xendit create failure without persisting', async () => {
    sinon.stub(prisma.invoice, 'findUnique').resolves(null);
    const post = sinon.stub(axios, 'post').rejects({ isAxiosError: true, response: { status: 401 } });
    const create = sinon.stub(prisma.invoice, 'create');
    const res = await request.post('/api/payments/create-invoice').send(input);
    assert.equal(res.status, 502);
    assert.equal(res.body.error.code, 'XENDIT_REQUEST_FAILED');
    assert.equal(post.callCount, 1);
    assert.equal(create.callCount, 0);
  });

  it('sends the expected Xendit request fields and authentication', async () => {
    sinon.stub(prisma.invoice, 'findUnique').resolves(null);
    sinon.stub(prisma.invoice, 'create').resolves(local);
    const post = sinon.stub(axios, 'post').resolves({ data: invoice });
    const res = await request.post('/api/payments/create-invoice').send(input);
    assert.equal(res.status, 201);
    assert.equal(post.firstCall.args[0], 'https://api.xendit.co/v2/invoices');
    const body = post.firstCall.args[1] as Record<string, unknown>;
    assert.equal(body.currency, 'IDR');
    assert.equal(body.external_id, input.external_id);
    assert.equal(body.success_redirect_url, undefined);
    assert.equal(post.firstCall.args[2]?.auth?.username, 'test-secret');
  });

  it('persists validated client details when Xendit does not echo them', async () => {
    sinon.stub(prisma.invoice, 'findUnique').resolves(null);
    const create = sinon.stub(prisma.invoice, 'create').resolves(local);
    const { payer_email: _email, description: _description, ...response } = invoice;
    sinon.stub(axios, 'post').resolves({ data: response });
    const res = await request.post('/api/payments/create-invoice').send(input);
    assert.equal(res.status, 201);
    assert.equal(create.firstCall.args[0].data.payerEmail, input.payer_email);
    assert.equal(create.firstCall.args[0].data.description, input.description);
  });

  it('rejects malformed JSON consistently', async () => {
    const res = await request.post('/api/payments/create-invoice')
      .set('Content-Type', 'application/json').send('{');
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });
});

describe('GET /api/payments/invoice/:id/status', () => {
  afterEach(() => sinon.restore());

  it('updates and returns status', async () => {
    sinon.stub(prisma.invoice, 'findUnique').resolves(local);
    sinon.stub(prisma.invoice, 'updateMany').resolves({ count: 1 });
    sinon.stub(xendit, 'getInvoiceStatus').resolves({ ...invoice, status: 'PAID', paid_at: '2026-01-01T00:00:00.000Z' });
    const res = await request.get('/api/payments/invoice/inv-1/status');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'PAID');
    assert.equal(res.body.paid_at, '2026-01-01T00:00:00.000Z');
  });

  it('returns 404 for unknown local invoice without contacting Xendit', async () => {
    sinon.stub(prisma.invoice, 'findUnique').resolves(null);
    const upstream = sinon.stub(xendit, 'getInvoiceStatus');
    const res = await request.get('/api/payments/invoice/missing/status');
    assert.equal(res.status, 404);
    assert.equal(upstream.callCount, 0);
  });

  it('does not let a concurrent status poll reverse a paid webhook', async () => {
    const find = sinon.stub(prisma.invoice, 'findUnique');
    find.onFirstCall().resolves(local);
    find.onSecondCall().resolves({ ...local, status: 'PAID', paidAt: new Date('2026-01-01T00:00:00Z') });
    const update = sinon.stub(prisma.invoice, 'updateMany').resolves({ count: 0 });
    sinon.stub(xendit, 'getInvoiceStatus').resolves(invoice);
    const res = await request.get('/api/payments/invoice/inv-1/status');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'PAID');
    assert.deepEqual(update.firstCall.args[0].where?.status, { notIn: ['PAID', 'SETTLED', 'EXPIRED'] });
  });

  for (const [upstreamStatus, expectedStatus] of [[404, 404], [401, 502], [403, 502], [429, 503], [500, 502]] as const) {
    it(`maps Xendit ${upstreamStatus} to ${expectedStatus}`, async () => {
      sinon.stub(prisma.invoice, 'findUnique').resolves(local);
      sinon.stub(axios, 'get').rejects({ isAxiosError: true, response: { status: upstreamStatus } });
      const res = await request.get('/api/payments/invoice/inv-1/status');
      assert.equal(res.status, expectedStatus);
      assert.equal(res.body.error.code, upstreamStatus === 404 ? 'INVOICE_NOT_FOUND' : 'XENDIT_REQUEST_FAILED');
    });
  }

  it('maps network failure to provider failure', async () => {
    sinon.stub(prisma.invoice, 'findUnique').resolves(local);
    sinon.stub(axios, 'get').rejects({ isAxiosError: true, code: 'ECONNRESET' });
    const res = await request.get('/api/payments/invoice/inv-1/status');
    assert.equal(res.status, 502);
    assert.equal(res.body.error.code, 'XENDIT_REQUEST_FAILED');
  });
});
