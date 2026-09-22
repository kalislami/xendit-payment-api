export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Xendit Payment API',
    version: '1.0.0',
    description: 'Invoice creation, status lookup, and secure Xendit invoice callbacks.',
  },
  servers: [{ url: '/api' }],
  components: {
    schemas: {
      ApiError: {
        type: 'object',
        properties: { error: { type: 'object', properties: {
          code: { type: 'string' }, message: { type: 'string' },
        }, required: ['code', 'message'] } },
        required: ['error'],
      },
      CreateInvoice: {
        type: 'object', required: ['external_id', 'amount', 'payer_email', 'description'],
        properties: {
          external_id: { type: 'string', minLength: 1, example: 'order-123' },
          amount: { type: 'integer', minimum: 1, maximum: 2147483647, example: 55000 },
          payer_email: { type: 'string', format: 'email', example: 'buyer@example.com' },
          description: { type: 'string', minLength: 1, example: 'Order 123' },
        },
      },
      InvoiceCallback: {
        type: 'object', required: ['id', 'external_id', 'status'],
        properties: {
          id: { type: 'string', example: 'invoice-id-from-xendit' },
          external_id: { type: 'string', example: 'order-123' },
          status: { type: 'string', enum: ['PENDING', 'PAID', 'SETTLED', 'EXPIRED'], example: 'PAID' },
          paid_at: { type: 'string', format: 'date-time', nullable: true, example: '2026-01-01T00:00:00Z' },
        },
      },
    },
  },
  paths: {
    '/payments/create-invoice': {
      post: {
        summary: 'Create and persist an invoice',
        requestBody: { required: true, content: { 'application/json': {
          schema: { $ref: '#/components/schemas/CreateInvoice' },
        } } },
        responses: {
          '201': { description: 'Invoice created', content: { 'application/json': { example: {
            id: 'invoice-id-from-xendit', external_id: 'order-123',
            invoice_url: 'https://checkout.xendit.co/example', status: 'PENDING', available_banks: [],
          } } } },
          '400': { description: 'VALIDATION_ERROR', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          '409': { description: 'DUPLICATE_EXTERNAL_ID', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          '502': { description: 'XENDIT_REQUEST_FAILED', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          '503': { description: 'Xendit rate limit', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/payments/invoice/{id}/status': {
      get: {
        summary: 'Fetch invoice status from Xendit and update the local record',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Invoice status', content: { 'application/json': { example: {
            id: 'invoice-id-from-xendit', status: 'PAID', paid_at: '2026-01-01T00:00:00Z',
            amount: 55000, invoice_url: 'https://checkout.xendit.co/example',
          } } } },
          '404': { description: 'INVOICE_NOT_FOUND', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          '502': { description: 'XENDIT_REQUEST_FAILED', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          '503': { description: 'Xendit rate limit', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/webhook/invoice-callback': {
      post: {
        summary: 'Process a Xendit invoice callback for an existing invoice',
        parameters: [{ name: 'x-callback-token', in: 'header', required: true,
          description: 'Xendit callback verification token', schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': {
          schema: { $ref: '#/components/schemas/InvoiceCallback' },
        } } },
        responses: {
          '200': { description: 'Callback accepted', content: { 'application/json': { example: { message: 'Ok' } } } },
          '400': { description: 'VALIDATION_ERROR', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          '403': { description: 'INVALID_CALLBACK_TOKEN', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          '404': { description: 'INVOICE_NOT_FOUND', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
  },
};
