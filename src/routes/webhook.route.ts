import { Router } from 'express';
import { verifyCallbackToken, handleInvoiceCallback } from '../controllers/webhook.controller';

const router = Router();

router.post('/invoice-callback', verifyCallbackToken, handleInvoiceCallback);

export default router;
