import { Router } from 'express';
import { createInvoice, getInvoiceStatus } from '../services/xendit.service';
import { prisma } from '../services/prisma.service';
import { InvoiceResponse } from '../types/invoice';
import { validationCreateInvoice } from '../validation/invoice.create';

const router = Router();

/**
 * @swagger
 * /payments/create-invoice:
 *   post:
 *     summary: Create new invoice
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               external_id:
 *                 type: string
 *               amount:
 *                 type: number
 *               payer_email:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Invoice created
 */
router.post('/create-invoice', async (req, res) => {
    try {
        const { isValid, error } = validationCreateInvoice(req.body);

        if (!isValid) {
            res.status(400).json({ error });
            return
        }

        const { external_id, amount, payer_email, description } = req.body;

        const invoice = await createInvoice({
            external_id,
            amount,
            payer_email,
            description,
        }) as InvoiceResponse;

        await prisma.invoice.create({
            data: {
                id: invoice.id,
                externalId: invoice.external_id,
                amount: invoice.amount,
                status: invoice.status,
                payerEmail: invoice.payer_email,
                description: invoice.description,
                invoiceUrl: invoice.invoice_url,
                paidAt: invoice.paid_at ? new Date(invoice.paid_at) : null,
            },
        });

        res.json({
            invoiceUrl: invoice.invoice_url,
            status: invoice.status,
            availableBanks: invoice.available_banks,
        });
    } catch (error: any) {
        console.error('Error creating invoice:', error.response?.data ?? error.message);
        res.status(500).json({ error: 'Failed to create invoice' });
    }
});

/**
 * @swagger
 * /payments/invoice/{id}/status:
 *   get:
 *     summary: Get invoice status by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Invoice ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Status of the invoice
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: PENDING
 *       404:
 *         description: Invoice not found
 */
router.get('/invoice/:id/status', async (req, res) => {
    const { id } = req.params;

    try {
        const invoice = await getInvoiceStatus(id) as InvoiceResponse;
        if (invoice == null) {
            res.status(404).json({ error: 'id tidak ditemukan' });
            return
        }

        await prisma.invoice.update({
            where: { id },
            data: {
                status: invoice.status,
                paidAt: invoice.status === 'PAID' && invoice.paid_at
                    ? new Date(invoice.paid_at)
                    : null,
            },
        });

        res.json({
            id: invoice.id,
            status: invoice.status,
            paid_at: invoice.paid_at,
            amount: invoice.amount,
            invoice_url: invoice.invoice_url,
        });
    } catch (error: any) {
        console.error('Gagal cek status invoice:', error.response?.data ?? error.message);
        res.status(500).json({ error: 'Gagal mengambil status invoice' });
    }
});

export default router;
