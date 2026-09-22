import { Router } from 'express';
import { createInvoice, getInvoiceStatus } from '../controllers/payment.controller';

const router = Router();
router.post('/create-invoice', createInvoice);
router.get('/invoice/:id/status', getInvoiceStatus);
export default router;
