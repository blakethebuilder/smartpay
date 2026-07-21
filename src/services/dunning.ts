import { db } from '../config/database';
import { evolutionApi } from './evolutionApi';
import { messageQueue } from './messageQueue';
import { formatCurrency } from '../utils/format';
import { v4 as uuidv4 } from 'uuid';

interface DunningRule {
  id: string;
  tenantId: string;
  enabled: boolean;
  reminder1DelayHours: number;   // Default 24h
  reminder2DelayHours: number;   // Default 48h
  reminder3DelayHours: number;   // Default 72h
  reminder1Message: string;
  reminder2Message: string;
  reminder3Message: string;
  createdAt: Date;
  updatedAt: Date;
}

interface DunningLog {
  id: string;
  tenantId: string;
  invoiceId: string;
  customerId: string;
  reminderNumber: number;
  sentAt: Date;
  status: 'sent' | 'failed' | 'cancelled';
  errorMessage?: string;
}

const DEFAULT_REMINDER_MESSAGES = {
  reminder1: `Hi {customerName},

Just a friendly reminder that your invoice for {amount} is still pending.

Pay here: {paymentLink}

Need help? Reply to this message.`,
  reminder2: `Hi {customerName},

Following up on your unpaid invoice of {amount}.

To avoid any inconvenience, please complete your payment here: {paymentLink}

Thank you!`,
  reminder3: `Hi {customerName},

Final reminder: Your invoice of {amount} is overdue.

Please pay now to avoid any service interruption: {paymentLink}

Questions? Reply to this message.`,
};

export class DunningService {
  async createRule(tenantId: string, rule: Partial<DunningRule>): Promise<DunningRule> {
    const [created] = await db('dunning_rules')
      .insert({
        id: uuidv4(),
        tenant_id: tenantId,
        enabled: rule.enabled ?? true,
        reminder1_delay_hours: rule.reminder1DelayHours ?? 24,
        reminder2_delay_hours: rule.reminder2DelayHours ?? 48,
        reminder3_delay_hours: rule.reminder3DelayHours ?? 72,
        reminder1_message: rule.reminder1Message ?? DEFAULT_REMINDER_MESSAGES.reminder1,
        reminder2_message: rule.reminder2Message ?? DEFAULT_REMINDER_MESSAGES.reminder2,
        reminder3_message: rule.reminder3Message ?? DEFAULT_REMINDER_MESSAGES.reminder3,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    return this.mapRule(created);
  }

  async getRule(tenantId: string): Promise<DunningRule | null> {
    const rule = await db('dunning_rules')
      .where({ tenant_id: tenantId })
      .first();

    return rule ? this.mapRule(rule) : null;
  }

  async updateRule(tenantId: string, updates: Partial<DunningRule>): Promise<DunningRule | null> {
    const [updated] = await db('dunning_rules')
      .where({ tenant_id: tenantId })
      .update({
        ...updates,
        updated_at: new Date(),
      })
      .returning('*');

    return updated ? this.mapRule(updated) : null;
  }

  async processUnpaidInvoices(): Promise<void> {
    // Find all tenants with dunning enabled
    const tenants = await db('dunning_rules')
      .where({ enabled: true })
      .select('tenant_id');

    for (const tenant of tenants) {
      await this.processTenantInvoices(tenant.tenant_id);
    }
  }

  private async processTenantInvoices(tenantId: string): Promise<void> {
    const rule = await this.getRule(tenantId);
    if (!rule || !rule.enabled) return;

    // Find unpaid invoices
    const unpaidInvoices = await db('invoices')
      .where({
        tenant_id: tenantId,
        status: 'pending',
      })
      .select('*');

    for (const invoice of unpaidInvoices) {
      await this.processInvoice(rule, invoice);
    }
  }

  private async processInvoice(rule: DunningRule, invoice: any): Promise<void> {
    const hoursSinceCreated = (Date.now() - new Date(invoice.created_at).getTime()) / (1000 * 60 * 60);

    // Check which reminder to send
    let reminderNumber = 0;
    let message = '';
    let delayHours = 0;

    if (hoursSinceCreated >= rule.reminder3DelayHours) {
      // Check if we already sent reminder 3
      const sent3 = await this.hasReminderBeenSent(invoice.id, 3);
      if (!sent3) {
        reminderNumber = 3;
        message = rule.reminder3Message;
        delayHours = rule.reminder3DelayHours;
      }
    } else if (hoursSinceCreated >= rule.reminder2DelayHours) {
      const sent2 = await this.hasReminderBeenSent(invoice.id, 2);
      if (!sent2) {
        reminderNumber = 2;
        message = rule.reminder2Message;
        delayHours = rule.reminder2DelayHours;
      }
    } else if (hoursSinceCreated >= rule.reminder1DelayHours) {
      const sent1 = await this.hasReminderBeenSent(invoice.id, 1);
      if (!sent1) {
        reminderNumber = 1;
        message = rule.reminder1Message;
        delayHours = rule.reminder1DelayHours;
      }
    }

    if (reminderNumber === 0) return;

    // Get customer details
    const customer = await db('customers')
      .where({ id: invoice.customer_id })
      .first();

    if (!customer) return;

    // Get WhatsApp instance
    const instance = await db('whatsapp_instances')
      .where({
        tenant_id: invoice.tenant_id,
        status: 'connected',
      })
      .first();

    if (!instance) return;

    // Generate payment link (simplified - in production, call billing service)
    const paymentLink = `https://smartpay.smartintegrate.co.za/pay/${invoice.id}`;

    // Format message
    const formattedMessage = message
      .replace('{customerName}', customer.name)
      .replace('{amount}', formatCurrency(invoice.amount, invoice.currency))
      .replace('{paymentLink}', paymentLink)
      .replace('{invoiceId}', invoice.id);

    // Queue the message
    await messageQueue.addJob({
      tenantId: invoice.tenant_id,
      instanceId: instance.id,
      customerId: customer.id,
      customerPhone: customer.phone,
      content: formattedMessage,
      type: 'text',
      priority: 'normal',
      metadata: {
        invoiceId: invoice.id,
        reminderNumber,
        dunning: true,
      },
    });

    // Log the reminder
    await db('dunning_logs').insert({
      id: uuidv4(),
      tenant_id: invoice.tenant_id,
      invoice_id: invoice.id,
      customer_id: customer.id,
      reminder_number: reminderNumber,
      sent_at: new Date(),
      status: 'sent',
    });

    console.log(`Dunning reminder ${reminderNumber} queued for invoice ${invoice.id}`);
  }

  private async hasReminderBeenSent(invoiceId: string, reminderNumber: number): Promise<boolean> {
    const log = await db('dunning_logs')
      .where({
        invoice_id: invoiceId,
        reminder_number: reminderNumber,
        status: 'sent',
      })
      .first();

    return !!log;
  }

  async cancelReminders(invoiceId: string): Promise<void> {
    await db('dunning_logs')
      .where({ invoice_id: invoiceId })
      .update({ status: 'cancelled' });
  }

  private mapRule(row: any): DunningRule {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      enabled: row.enabled,
      reminder1DelayHours: row.reminder1_delay_hours,
      reminder2DelayHours: row.reminder2_delay_hours,
      reminder3DelayHours: row.reminder3_delay_hours,
      reminder1Message: row.reminder1_message,
      reminder2Message: row.reminder2_message,
      reminder3Message: row.reminder3_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const dunningService = new DunningService();
