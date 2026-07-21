import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { tenantIsolation } from '../middleware/tenant';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import { whatsappService } from '../services/whatsapp';

const router = Router();

// Validation schemas
const createInstanceSchema = z.object({
  name: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
});

const sendMessageSchema = z.object({
  instanceId: z.string().uuid(),
  customerId: z.string().uuid(),
  content: z.string().max(4000),
  type: z.enum(['text', 'media']).default('text'),
  mediaUrl: z.string().url().optional(),
});

// List instances
router.get('/instances', requireAuth, tenantIsolation, async (req, res) => {
  try {
    const { db } = await import('../config/database');
    
    const instances = await db('whatsapp_instances')
      .where({ tenant_id: req.context!.tenantId })
      .orderBy('created_at', 'desc');

    res.json(instances.map((inst) => ({
      id: inst.id,
      instanceName: inst.instance_name,
      instanceId: inst.instance_id,
      status: inst.status,
      phoneNumber: inst.phone_number,
      createdAt: inst.created_at,
      updatedAt: inst.updated_at,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch instances' });
  }
});

// Create instance
router.post('/instances', requireAuth, tenantIsolation, validate(createInstanceSchema), async (req, res) => {
  try {
    const instance = await whatsappService.createInstance(
      req.context!.tenantId,
      req.body.name
    );

    res.status(201).json(instance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create instance' });
  }
});

// Get QR code
router.get('/instances/:id/qr', requireAuth, tenantIsolation, async (req, res) => {
  try {
    const qrCode = await whatsappService.getQRCode(
      req.params.id,
      req.context!.tenantId
    );

    res.json(qrCode);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get QR code' });
  }
});

// Get instance status
router.get('/instances/:id/status', requireAuth, tenantIsolation, async (req, res) => {
  try {
    const status = await whatsappService.getStatus(
      req.params.id,
      req.context!.tenantId
    );

    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Send message
router.post('/messages', requireAuth, tenantIsolation, validate(sendMessageSchema), async (req, res) => {
  try {
    const message = await whatsappService.sendMessage(
      req.context!.tenantId,
      req.body.instanceId,
      req.body.customerId,
      req.body.content,
      req.body.type,
      req.body.mediaUrl
    );

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get messages
router.get('/messages', requireAuth, tenantIsolation, async (req, res) => {
  try {
    const { db } = await import('../config/database');
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const instanceId = req.query.instanceId as string;

    let query = db('messages')
      .where({ tenant_id: req.context!.tenantId })
      .orderBy('created_at', 'desc');

    if (instanceId) {
      query = query.where({ instance_id: instanceId });
    }

    const messages = await query.limit(limit).offset((page - 1) * limit);

    res.json(messages.map((msg) => ({
      id: msg.id,
      instanceId: msg.instance_id,
      customerId: msg.customer_id,
      type: msg.type,
      content: msg.content,
      status: msg.status,
      sentAt: msg.sent_at,
      createdAt: msg.created_at,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;
