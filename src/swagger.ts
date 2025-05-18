import swaggerJSDoc from 'swagger-jsdoc';

export const swaggerOptions: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Xendit Payment API',
      version: '1.0.0',
      description: 'API untuk integrasi pembayaran menggunakan Xendit',
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // Sesuaikan dengan path route kamu
};

export const swaggerSpec = swaggerJSDoc(swaggerOptions);