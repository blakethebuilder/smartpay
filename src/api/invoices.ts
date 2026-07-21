import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { tenantIsolation } from '../middleware/tenant';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import { billingService, Gateway, GATEWAY_INFO } from '../services/billing';
import { db } from '../config/database';

const router = Router();

// Validation schemas
const createInvoiceSchema = z.object({
  customerId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3).default('ZAR'),
  description: z.string().max(500).optional(),
  dueDate: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const createPaymentLinkSchema = z.object({
  invoiceId: z.string().uuid(),
  gateway: z.enum(['paystack', 'ozow', 'payflex', 'payjustnow']),
});

// List invoices
router.get('/', requireAuth, tenantIsolation, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as string;

    let query = db('invoices')
      .where({ tenant_id: req.context!.tenantId })
      .orderBy('created_at', 'desc');

    if (status) {
      query = query.where({ status });
    }

    const invoices = await query.limit(limit).offset((page - 1) * limit);

    const [{ count }] = await db('invoices')
      .where({ tenant_id: req.context!.tenantId })
      .count('* as count');

    res.json({
      invoices: invoices.map((inv: any) => ({
        id: inv.id,
        customerId: inv.customer_id,
        amount: parseFloat(inv.amount),
        currency: inv.currency,
        status: inv.status,
        description: inv.description,
        metadata: inv.metadata ? JSON.parse(inv.metadata) : undefined,
        dueDate: inv.due_date,
        paidAt: inv.paid_at,
        createdAt: inv.created_at,
        updatedAt: inv.updated_at,
      })),
      pagination: {
        page,
        limit,
        total: parseInt(count as string),
        pages: Math.ceil(parseInt(count as string) / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// List available payment gateways (must be before /:id)
router.get('/gateways', requireAuth, async (req, res) => {
  try {
    const gateways = Object.entries(GATEWAY_INFO).map(([key, info]) => ({
      id: key,
      name: info.name,
      description: info.description,
      status: info.status,
    }));
    res.json(gateways);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch gateways' });
  }
});

// Get invoice by ID
router.get('/:id', requireAuth, tenantIsolation, async (req, res) => {
  try {
    const invoice = await db('invoices')
      .where({ id: req.params.id, tenant_id: req.context!.tenantId })
      .first();

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    res.json({
      id: invoice.id,
      customerId: invoice.customer_id,
      amount: parseFloat(invoice.amount),
      currency: invoice.currency,
      status: invoice.status,
      description: invoice.description,
      metadata: invoice.metadata ? JSON.parse(invoice.metadata) : undefined,
      dueDate: invoice.due_date,
      paidAt: invoice.paid_at,
      createdAt: invoice.created_at,
      updatedAt: invoice.updated_at,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Create invoice
router.post('/', requireAuth, tenantIsolation, validate(createInvoiceSchema), async (req, res) => {
  try {
    const invoice = await billingService.createInvoice(
      req.context!.tenantId,
      req.body.customerId,
      req.body.amount,
      req.body.currency,
      req.body.description,
      req.body.dueDate ? new Date(req.body.dueDate) : undefined,
      req.body.metadata
    );

    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Generate payment link
router.post('/payment-link', requireAuth, tenantIsolation, validate(createPaymentLinkSchema), async (req, res) => {
  try {
    const { paymentUrl, reference } = await billingService.createPaymentLink(
      req.context!.tenantId,
      req.body.invoiceId,
      req.body.gateway
    );

    res.json({ paymentUrl, reference });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create payment link' });
  }
});

export default router;
