import assert from 'node:assert/strict';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../src/app';
import { prisma } from '../src/services/prisma.service';

const request = supertest(app);
const url = '/api/webhook/invoice-callback';
const token = 'test-callback-token';
const paidAt = '2026-01-01T00:00:00.000Z';
const payload = { id: 'inv-1', external_id: 'order-1', status: 'PAID', paid_at: paidAt };
const local = {
  id: 'inv-1', externalId: 'order-1', status: 'PENDING', amount: 55000,
  payerEmail: 'test@example.com', description: 'Order 1',
  invoiceUrl: 'https://checkout.example.com/1', paidAt: null, createdAt: new Date(),
};

describe('POST /api/webhook/invoice-callback', () => {
  afterEach(() => sinon.restore());

  it('rejects invalid token before database access', async () => {
    const find = sinon.stub(prisma.invoice, 'findUnique');
    const update = sinon.stub(prisma.invoice, 'updateMany');
    const res = await request.post(url).set('x-callback-token', 'invalid').send(payload);
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'INVALID_CALLBACK_TOKEN');
    assert.equal(find.callCount, 0);
    assert.equal(update.callCount, 0);
  });

  it('rejects malformed payload without database access', async () => {
    const find = sinon.stub(prisma.invoice, 'findUnique');
    const res = await request.post(url).set('x-callback-token', token).send({ id: 'inv-1' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.equal(find.callCount, 0);
  });

  it('updates only lifecycle fields of an existing invoice', async () => {
    sinon.stub(prisma.invoice, 'findUnique').resolves(local);
    const update = sinon.stub(prisma.invoice, 'updateMany').resolves({ count: 1 });
    const res = await request.post(url).set('x-callback-token', token).send(payload);
    assert.equal(res.status, 200);
    assert.deepEqual(Object.keys(update.firstCall.args[0].data).sort(), ['paidAt', 'status']);
    assert.equal(update.firstCall.args[0].data.status, 'PAID');
    assert.equal(update.firstCall.args[0].where?.externalId, local.externalId);
  });

  it('does not create an unknown or mismatched invoice', async () => {
    const find = sinon.stub(prisma.invoice, 'findUnique').resolves(null);
    const update = sinon.stub(prisma.invoice, 'updateMany');
    const create = sinon.stub(prisma.invoice, 'create');
    const unknown = await request.post(url).set('x-callback-token', token).send(payload);
    assert.equal(unknown.status, 404);
    find.resolves({ ...local, externalId: 'other-order' });
    const mismatch = await request.post(url).set('x-callback-token', token).send(payload);
    assert.equal(mismatch.status, 404);
    assert.equal(update.callCount, 0);
    assert.equal(create.callCount, 0);
  });

  it('accepts a repeated callback without changing unrelated fields', async () => {
    sinon.stub(prisma.invoice, 'findUnique').resolves(local);
    const update = sinon.stub(prisma.invoice, 'updateMany').resolves({ count: 1 });
    const first = await request.post(url).set('x-callback-token', token).send(payload);
    const second = await request.post(url).set('x-callback-token', token).send(payload);
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(update.callCount, 2);
    assert.deepEqual(update.firstCall.args[0].data, update.secondCall.args[0].data);
  });

  it('does not overwrite paidAt when the callback omits it', async () => {
    sinon.stub(prisma.invoice, 'findUnique').resolves(local);
    const update = sinon.stub(prisma.invoice, 'updateMany').resolves({ count: 1 });
    const res = await request.post(url).set('x-callback-token', token).send({ ...payload, paid_at: undefined });
    assert.equal(res.status, 200);
    assert.deepEqual(update.firstCall.args[0].data, { status: 'PAID' });
  });

  it('does not regress a paid invoice on a late PENDING callback', async () => {
    sinon.stub(prisma.invoice, 'findUnique').resolves({ ...local, status: 'PAID', paidAt: new Date(paidAt) });
    const update = sinon.stub(prisma.invoice, 'updateMany');
    const res = await request.post(url).set('x-callback-token', token)
      .send({ id: payload.id, external_id: payload.external_id, status: 'PENDING' });
    assert.equal(res.status, 200);
    assert.equal(update.callCount, 0);
  });
});
