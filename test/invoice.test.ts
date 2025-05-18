import chai from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../src/app';
import * as invoiceService from '../src/services/xendit.service';
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

describe('GET /invoice/:id/status', () => {

    let getStatusStub: sinon.SinonStub;

    const endpoint = (id: string) => `/api/payments/invoice/${id}/status`;

    beforeEach(() => {
        getStatusStub = sinon.stub(invoiceService, 'getInvoiceStatus');
    });

    afterEach(() => {
        sinon.restore();
    });

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

    it('should return 200 and invoice status when found', async () => {
        getStatusStub.resolves(mockData);

        const res = await request.get(endpoint('inv-001'));

        expect(res.status).to.equal(200);
        expect(res.body).to.deep.equal({ id: 'inv-001', status: 'PENDING', amount: 55000 });
    });

    it('should return 404 when invoice not found', async () => {
        getStatusStub.resolves(null);

        const res = await request.get(endpoint('inv-404'));

        expect(res.status).to.equal(404);
        expect(res.body).to.deep.equal({ error: 'id tidak ditemukan' });
    });

    it('should return 500 when service throws error', async () => {
        getStatusStub.rejects(new Error('Connection error'));

        const res = await request.get(endpoint('inv-err'));

        expect(res.status).to.equal(500);
        expect(res.body).to.deep.equal({ error: 'Gagal mengambil status invoice' });
    });
});

describe('POST /create-invoice', () => {

    let createInvoiceStub: sinon.SinonStub;

    const endpoint = `/api/payments/create-invoice`;

    beforeEach(() => {
        createInvoiceStub = sinon.stub(invoiceService, 'createInvoice');
    });

    afterEach(() => {
        sinon.restore();
    });

    after(async () => {
        await prisma.invoice.delete({
            where: { id: mockData.id },
        });
    });

    it('should return 200 success create invoice', async () => {
        const mockCreateInvoiceStub = {
            ...mockData,
            external_id: mockData.externalId,
            payer_email: mockData.payerEmail,
            invoice_url: mockData.invoiceUrl
        }
        createInvoiceStub.resolves(mockCreateInvoiceStub);

        const res = await request.post(endpoint)
            .send({
                external_id: mockData.externalId,
                amount: mockData.amount,
                payer_email: mockData.payerEmail,
                description: mockData.description,
            });

        expect(res.status).to.equal(200);
        expect(res.body).to.deep.equal({ invoiceUrl: 'http://invoiceUrl', status: 'PENDING' });
    });

    it('should return 400 if input is invalid', async () => {
        const res = await request.post(endpoint)
            .send({
                amount: mockData.amount,
                payer_email: '',
                description: 'No external_id',
            });

        expect(res.status).to.equal(400);
        expect(res.body).to.have.property('error');
    });

    it('should return 500 on unexpected error', async () => {
        createInvoiceStub.rejects(new Error('Connection error'));

        const res = await request.post(endpoint)
            .send({
                external_id: mockData.externalId,
                amount: mockData.amount,
                payer_email: mockData.payerEmail,
                description: mockData.description,
            });

        expect(res.status).to.equal(500);
        expect(res.body).to.have.property('error');
    });
});