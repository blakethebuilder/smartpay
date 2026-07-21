import { db } from '../config/database';
import { Invoice, Payment } from '../types';
import { paystackService } from './paystack';
import { ozowService } from './ozow';
import { v4 as uuidv4 } from 'uuid';

export type Gateway = 'paystack' | 'ozow' | 'payflex' | 'payjustnow';

export const GATEWAY_INFO: Record<Gateway, { name: string; description: string; status: 'live' | 'coming_soon' }> = {
  paystack: { name: 'Paystack', description: 'Cards, Bank Transfer, USSD', status: 'live' },
  ozow: { name: 'Ozow', description: 'Instant EFT', status: 'live' },
  payflex: { name: 'Payflex', description: 'Buy Now Pay Later', status: 'coming_soon' },
  payjustnow: { name: 'PayJustNow', description: 'Buy Now Pay Later', status: 'coming_soon' },
};

export class BillingService {
  async createInvoice(
    tenantId: string,
    customerId: string,
    amount: number,
    currency: string = 'ZAR',
    description?: string,
    dueDate?: Date,
    metadata?: Record<string, unknown>
  ): Promise<Invoice> {
    const [invoice] = await db('invoices')
      .insert({
        id: uuidv4(),
        tenant_id: tenantId,
        customer_id: customerId,
        amount,
        currency,
        status: 'pending',
        description,
        due_date: dueDate,
        metadata: metadata ? JSON.stringify(metadata) : null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    return this.mapInvoice(invoice);
  }

  async getAvailableGateways(): Promise<Gateway[]> {
    return ['paystack', 'ozow', 'payflex', 'payjustnow'];
  }

  async createPaymentLink(
    tenantId: string,
    invoiceId: string,
    gateway: Gateway
  ): Promise<{ paymentUrl: string; reference: string }> {
    const invoice = await db('invoices')
      .where({ id: invoiceId, tenant_id: tenantId })
      .first();

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const customer = await db('customers')
      .where({ id: invoice.customer_id, tenant_id: tenantId })
      .first();

    if (!customer) {
      throw new Error('Customer not found');
    }

    const reference = `SP-${tenantId.substring(0, 8)}-${invoiceId.substring(0, 8)}-${Date.now()}`;
    const callbackBase = process.env.PAYMENT_BASE_URL || 
      (process.env.NODE_ENV === 'production' ? 'https://payapi.smartintegrate.co.za' : 'http://localhost:3000');

    // Create payment record
    const [payment] = await db('payments')
      .insert({
        id: uuidv4(),
        tenant_id: tenantId,
        invoice_id: invoiceId,
        gateway,
        gateway_reference: reference,
        amount: invoice.amount,
        currency: invoice.currency,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    // For live gateways with merchant credentials
    const merchant = await db('merchants')
      .where({ tenant_id: tenantId, gateway, is_active: true })
      .first();

    if (merchant) {
      // Real integration
      if (gateway === 'paystack') {
        const result = await paystackService.initializeTransaction(
          merchant.id, invoice.amount, customer.email || customer.phone,
          { invoice_id: invoiceId, payment_id: payment.id, tenant_id: tenantId }
        );
        return { paymentUrl: result.data.authorization_url, reference };
      }

      if (gateway === 'ozow') {
        const result = await ozowService.createPaymentLink(
          merchant.id, invoice.amount, reference,
          `${callbackBase}/webhooks/ozow/callback?payment_id=${payment.id}`,
          `${callbackBase}/webhooks/ozow/cancel?payment_id=${payment.id}`
        );
        return { paymentUrl: result.url || result.paymentUrl, reference };
      }
    }

    // Demo mode: return a mock payment page URL
    const demoUrl = `${callbackBase}/pay/demo/${reference}?gateway=${gateway}&amount=${invoice.amount}&currency=${invoice.currency}`;
    return { paymentUrl: demoUrl, reference };
  }

  async simulatePayment(reference: string): Promise<{ success: boolean; message: string }> {
    const payment = await db('payments')
      .where({ gateway_reference: reference })
      .first();

    if (!payment) {
      return { success: false, message: 'Payment not found' };
    }

    if (payment.status === 'success') {
      return { success: false, message: 'Payment already processed' };
    }

    // Simulate successful payment
    await db('payments')
      .where({ id: payment.id })
      .update({
        status: 'success',
        metadata: JSON.stringify({ simulated: true, simulated_at: new Date().toISOString() }),
        updated_at: new Date(),
      });

    await db('invoices')
      .where({ id: payment.invoice_id })
      .update({
        status: 'paid',
        paid_at: new Date(),
        updated_at: new Date(),
      });

    return { success: true, message: 'Payment simulated successfully' };
  }

  async handleWebhook(
    gateway: string,
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    // Store webhook event for idempotency
    const eventId = payload.id as string || payload.reference as string;
    
    const existingEvent = await db('webhook_events')
      .where({ 
        gateway, 
        event_type: eventType,
        status: 'processed'
      })
      .first();

    if (existingEvent) {
      // Already processed, skip
      return;
    }

    // Store the event
    await db('webhook_events').insert({
      id: uuidv4(),
      gateway,
      event_type: eventType,
      payload: JSON.stringify(payload),
      status: 'processed',
      processed_at: new Date(),
      created_at: new Date(),
    });

    // Process based on event type
    if (eventType === 'charge.success' || eventType === 'payment.success') {
      await this.processSuccessfulPayment(gateway, payload);
    }
  }

  private async processSuccessfulPayment(
    gateway: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const reference = payload.reference as string || payload.transactionReference as string;
    
    if (!reference) {
      throw new Error('Missing payment reference');
    }

    const payment = await db('payments')
      .where({ gateway_reference: reference, gateway })
      .first();

    if (!payment) {
      throw new Error(`Payment not found for reference: ${reference}`);
    }

    // Update payment status
    await db('payments')
      .where({ id: payment.id })
      .update({
        status: 'success',
        metadata: JSON.stringify(payload),
        updated_at: new Date(),
      });

    // Update invoice status
    await db('invoices')
      .where({ id: payment.invoice_id })
      .update({
        status: 'paid',
        paid_at: new Date(),
        updated_at: new Date(),
      });
  }

  private mapInvoice(row: any): Invoice {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      customerId: row.customer_id,
      amount: parseFloat(row.amount),
      currency: row.currency,
      status: row.status,
      description: row.description,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      dueDate: row.due_date,
      paidAt: row.paid_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const billingService = new BillingService();
