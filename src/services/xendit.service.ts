import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

import { CreateInvoicePayload } from '../types/invoice';

const XENDIT_BASE_URL = 'https://api.xendit.co/v2/invoices';
const SECRET_KEY = process.env.XENDIT_SECRET_KEY ?? '';

const authHeader = Buffer.from(`${SECRET_KEY}:`).toString('base64');

export async function createInvoice(payload: CreateInvoicePayload) {
    const response = await axios.post(
        XENDIT_BASE_URL,
        {
            external_id: payload.external_id,
            amount: payload.amount,
            payer_email: payload.payer_email,
            description: payload.description,
            success_redirect_url: 'https://your-site.com/payment-success',
            currency: 'IDR',
            expiration_date: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 jam
        },
        {
            headers: {
                'Authorization': `Basic ${authHeader}`,
                'Content-Type': 'application/json',
            },
        }
    );

    return response.data;
}

export const getInvoiceStatus = async (invoiceId: string) => {
    try {
        const url = `${XENDIT_BASE_URL}/${invoiceId}`;
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Basic ${authHeader}`
            },
        });
        return response.data;
    } catch (error) {
        console.log('error getInvoiceStatus:', JSON.stringify(error));
        return null
    }
};