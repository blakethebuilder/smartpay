import { Router, Request, Response } from 'express';
import { billingService } from '../services/billing';
import { whatsappService } from '../services/whatsapp';
import { hashWebhookPayload } from '../utils/encryption';
import { config } from '../config';

const router = Router();

// Paystack webhook
router.post('/paystack', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-paystack-signature'] as string;
    const payload = JSON.stringify(req.body);

    // Verify webhook signature
    const hash = hashWebhookPayload(payload, config.paystack.webhookSecret);
    if (hash !== signature) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    const { event, data } = req.body;
    const tenantId = data.metadata?.tenant_id;

    if (!tenantId) {
      res.status(400).json({ error: 'Missing tenant_id in metadata' });
      return;
    }

    // Process webhook with idempotency
    await billingService.handleWebhook('paystack', event, {
      ...data,
      tenant_id: tenantId,
    });

    res.json({ received: true });
  } catch (error) {
    console.error('Paystack webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Ozow webhook
router.post('/ozow', async (req: Request, res: Response) => {
  try {
    const { status, transactionReference, errorMessage } = req.body;

    // Determine event type based on status
    let eventType: string;
    switch (status?.toLowerCase()) {
      case 'complete':
        eventType = 'payment.success';
        break;
      case 'cancelled':
        eventType = 'payment.cancelled';
        break;
      case 'error':
        eventType = 'payment.failed';
        break;
      default:
        eventType = 'payment.unknown';
    }

    // Process webhook with idempotency
    await billingService.handleWebhook('ozow', eventType, req.body);

    res.json({ received: true });
  } catch (error) {
    console.error('Ozow webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Evolution API webhook (WhatsApp)
router.post('/whatsapp', async (req: Request, res: Response) => {
  try {
    const { event, instance, data } = req.body;

    // Process WhatsApp webhook
    await whatsappService.handleWebhook(event, {
      instance,
      ...data,
    });

    res.json({ received: true });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Payment callback URLs (for redirect after payment)
router.get('/paystack/callback', async (req: Request, res: Response) => {
  const { trxref, reference } = req.query;
  
  // Redirect to frontend with reference
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/payment/success?reference=${reference || trxref}`);
});

router.get('/ozow/callback', async (req: Request, res: Response) => {
  const { payment_id } = req.query;
  
  // Redirect to frontend
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/payment/success?payment_id=${payment_id}`);
});

router.get('/ozow/cancel', async (req: Request, res: Response) => {
  const { payment_id } = req.query;
  
  // Redirect to frontend
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/payment/cancelled?payment_id=${payment_id}`);
});

export default router;
