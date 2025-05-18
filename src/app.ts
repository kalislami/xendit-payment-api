import express from 'express';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import paymentRoutes from './routes/payment.route';
import webhookRoutes from './routes/webhook.route';

dotenv.config();

const app = express();
app.use(express.json());

app.use('/api/payments', paymentRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

export default app;