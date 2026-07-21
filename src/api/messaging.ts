import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { tenantIsolation } from '../middleware/tenant';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import { messageQueue } from '../services/messageQueue';
import { dunningService } from '../services/dunning';
import { db } from '../config/database';

const router = Router();

// Validation schemas
const sendMessageSchema = z.object({
  instanceId: z.string().uuid(),
  customerId: z.string().uuid(),
  content: z.string().min(1).max(4000),
  type: z.enum(['text', 'media']).default('text'),
  mediaUrl: z.string().url().optional(),
  priority: z.enum(['high', 'normal', 'low']).default('normal'),
});

const updateDunningRuleSchema = z.object({
  enabled: z.boolean().optional(),
  reminder1DelayHours: z.number().min(1).max(168).optional(),
  reminder2DelayHours: z.number().min(1).max(168).optional(),
  reminder3DelayHours: z.number().min(1).max(168).optional(),
  reminder1Message: z.string().max(2000).optional(),
  reminder2Message: z.string().max(2000).optional(),
  reminder3Message: z.string().max(2000).optional(),
});

// Send message with anti-ban features
router.post('/send', requireAuth, tenantIsolation, validate(sendMessageSchema), async (req: Request, res: Response) => {
  try {
    const { instanceId, customerId, content, type, mediaUrl, priority } = req.body;

    // Get instance details
    const instance = await db('whatsapp_instances')
      .where({ id: instanceId, tenant_id: req.context!.tenantId })
      .first();

    if (!instance) {
      res.status(404).json({ error: 'WhatsApp instance not found' });
      return;
    }

    if (instance.status !== 'connected') {
      res.status(400).json({ error: 'WhatsApp instance is not connected' });
      return;
    }

    // Get customer details
    const customer = await db('customers')
      .where({ id: customerId, tenant_id: req.context!.tenantId })
      .first();

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    // Sanitize phone number for Evolution API (remove spaces, dashes, + prefix)
    const cleanPhone = customer.phone.replace(/[\s\-\(\)\+]/g, '');

    // Send directly via Evolution API with typing indicator
    const { evolutionApi } = await import('../services/evolutionApi');

    try {
      // Send typing indicator
      await evolutionApi.sendPresence(instance.instance_name, cleanPhone, 'composing');

      // Wait based on message length (humanization)
      const typingDuration = Math.min(2000 + (content.length * 10), 5000);
      await new Promise(resolve => setTimeout(resolve, typingDuration));

      // Stop typing indicator
      await evolutionApi.sendPresence(instance.instance_name, cleanPhone, 'paused');

      // Small random delay (3-7 seconds)
      const delay = Math.floor(Math.random() * 4000) + 3000;
      await new Promise(resolve => setTimeout(resolve, delay));

      // Send the message
      if (type === 'media' && mediaUrl) {
        await evolutionApi.sendMedia(instance.instance_name, cleanPhone, mediaUrl, content);
      } else {
        await evolutionApi.sendMessage(instance.instance_name, cleanPhone, content, false);
      }

      // Log the message
      await db('messages').insert({
        id: require('uuid').v4(),
        tenant_id: req.context!.tenantId,
        instance_id: instanceId,
        customer_id: customerId,
        type: type || 'text',
        content,
        status: 'sent',
        sent_at: new Date(),
        created_at: new Date(),
      });

      res.json({
        status: 'sent',
        message: 'Message sent successfully',
      });
    } catch (error: any) {
      console.error('Failed to send message:', error);
      res.status(500).json({ error: 'Failed to send message: ' + (error.message || 'Unknown error') });
    }
  } catch (error) {
    console.error('Failed to queue message:', error);
    res.status(500).json({ error: 'Failed to queue message' });
  }
});

// Get queue status
router.get('/queue/status', requireAuth, async (req: Request, res: Response) => {
  try {
    res.json({
      queueSize: messageQueue.getQueueSize(),
      activeJobs: messageQueue.getActiveJobs().length,
      isBusinessHours: messageQueue.isBusinessHoursNow(),
      nextBusinessHours: messageQueue.isBusinessHoursNow()
        ? 'Currently in business hours'
        : 'Next business day at 08:00 SAST',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get queue status' });
  }
});

// Cancel a queued message
router.delete('/queue/:jobId', requireAuth, async (req: Request, res: Response) => {
  try {
    const removed = messageQueue.removeJob(req.params.jobId);
    if (removed) {
      res.json({ message: 'Job removed from queue' });
    } else {
      res.status(404).json({ error: 'Job not found in queue' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

// Get dunning rule
router.get('/dunning', requireAuth, tenantIsolation, async (req: Request, res: Response) => {
  try {
    let rule = await dunningService.getRule(req.context!.tenantId);

    if (!rule) {
      // Create default rule
      rule = await dunningService.createRule(req.context!.tenantId, {});
    }

    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get dunning rule' });
  }
});

// Update dunning rule
router.put('/dunning', requireAuth, tenantIsolation, validate(updateDunningRuleSchema), async (req: Request, res: Response) => {
  try {
    let rule = await dunningService.getRule(req.context!.tenantId);

    if (!rule) {
      rule = await dunningService.createRule(req.context!.tenantId, req.body);
    } else {
      rule = (await dunningService.updateRule(req.context!.tenantId, req.body)) || rule;
    }

    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update dunning rule' });
  }
});

// Get dunning logs for an invoice
router.get('/dunning/logs/:invoiceId', requireAuth, tenantIsolation, async (req: Request, res: Response) => {
  try {
    const logs = await db('dunning_logs')
      .where({
        invoice_id: req.params.invoiceId,
        tenant_id: req.context!.tenantId,
      })
      .orderBy('sent_at', 'desc');

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get dunning logs' });
  }
});

// Cancel dunning for an invoice
router.post('/dunning/cancel/:invoiceId', requireAuth, tenantIsolation, async (req: Request, res: Response) => {
  try {
    await dunningService.cancelReminders(req.params.invoiceId);
    res.json({ message: 'Dunning reminders cancelled' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel dunning' });
  }
});

// Process dunning (admin endpoint - would be called by cron)
router.post('/dunning/process', requireAuth, requireRole('owner', 'admin'), async (req: Request, res: Response) => {
  try {
    await dunningService.processUnpaidInvoices();
    res.json({ message: 'Dunning processing completed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process dunning' });
  }
});

export default router;
