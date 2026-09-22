import express from 'express';
import './config/env';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import paymentRoutes from './routes/payment.route';
import webhookRoutes from './routes/webhook.route';
import { errorHandler } from './middleware/error-handler';

const app = express();
app.use(express.json());

app.use('/api/payments', paymentRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(errorHandler);

export default app;
