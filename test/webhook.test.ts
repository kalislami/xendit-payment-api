import chai from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../src/app';
import { prisma } from '../src/services/prisma.service';

const { expect } = chai;
const request = supertest(app);

const mockData = {
    id: 'inv-001',
    externalId: 'ext-id-001',
    amount: 55000,
    status: 'PENDING',
    payerEmail: 'test@mail.co',
    description: 'testing create invoice',
    invoiceUrl: 'http://invoiceUrl',
    paidAt: null
}

const payload = {
    id: mockData.id,
    status: "PAID",
    paid_at: new Date().toISOString(),
    external_id: mockData.externalId
}

const CALLBACK_SECRET = process.env.XENDIT_CALLBACK_TOKEN ?? 'token';

describe('POST /invoice-callback', () => {
    const endpoint = `/api/webhook/invoice-callback`;

    before(async () => {
        await prisma.invoice.create({
            data: mockData
        });
    });

    after(async () => {
        await prisma.invoice.delete({
            where: { id: mockData.id },
        });
    });

    it('should return 200 success callback', async () => {
        const res = await request.post(endpoint)
            .set('x-callback-token', CALLBACK_SECRET)
            .send(payload);

        expect(res.status).to.equal(200);
        expect(res.body).to.deep.equal({ message: 'Ok' });
    });

    it('should return 403 if token is invalid', async () => {
        const res = await request.post(endpoint)
            .set('x-callback-token', 'wrong token')
            .send(payload);

        expect(res.status).to.equal(403);
        expect(res.body).to.have.property('error');
    });

    it('should return 400 if input is invalid', async () => {
        const res = await request.post(endpoint)
            .set('x-callback-token', CALLBACK_SECRET)
            .send({});

        expect(res.status).to.equal(400);
        expect(res.body).to.have.property('error');
    });
});