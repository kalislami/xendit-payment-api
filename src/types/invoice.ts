export interface InvoiceResponse {
  id: string;
  external_id: string;
  amount: number;
  status: string;
  payer_email: string;
  description: string;
  invoice_url: string | null;
  paid_at: string | null;
  available_banks: object;
}

export type CreateInvoicePayload = {
    external_id: string;
    amount: number;
    payer_email: string;
    description: string;
};