import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { tenantIsolation } from '../middleware/tenant';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import { db } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { encrypt, decrypt } from '../utils/encryption';

const router = Router();

// Validation schemas
const createTenantSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
});

const createMerchantSchema = z.object({
  gateway: z.enum(['paystack', 'ozow']),
  publicKey: z.string().min(1),
  secretKey: z.string().min(1),
  webhookSecret: z.string().optional(),
});

// Get tenant profile
router.get('/profile', requireAuth, tenantIsolation, async (req, res) => {
  try {
    const tenant = await db('tenants')
      .where({ id: req.context!.tenantId })
      .first();

    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    res.json({
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      status: tenant.status,
      createdAt: tenant.created_at,
      updatedAt: tenant.updated_at,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenant profile' });
  }
});

// Update tenant profile
router.put('/profile', requireAuth, tenantIsolation, validate(createTenantSchema), async (req, res) => {
  try {
    const [tenant] = await db('tenants')
      .where({ id: req.context!.tenantId })
      .update({
        name: req.body.name,
        phone: req.body.phone,
        updated_at: new Date(),
      })
      .returning('*');

    res.json({
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      status: tenant.status,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tenant profile' });
  }
});

// List merchants for tenant
router.get('/merchants', requireAuth, tenantIsolation, async (req, res) => {
  try {
    const merchants = await db('merchants')
      .where({ tenant_id: req.context!.tenantId })
      .select('id', 'gateway', 'is_active', 'created_at');

    res.json(merchants.map((m) => ({
      id: m.id,
      gateway: m.gateway,
      isActive: m.is_active,
      createdAt: m.created_at,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch merchants' });
  }
});

// Add merchant credentials
router.post('/merchants', requireAuth, requireRole('owner', 'admin'), tenantIsolation, validate(createMerchantSchema), async (req, res) => {
  try {
    const [merchant] = await db('merchants')
      .insert({
        id: uuidv4(),
        tenant_id: req.context!.tenantId,
        gateway: req.body.gateway,
        public_key_encrypted: encrypt(req.body.publicKey),
        secret_key_encrypted: encrypt(req.body.secretKey),
        webhook_secret_encrypted: req.body.webhookSecret ? encrypt(req.body.webhookSecret) : null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    res.status(201).json({
      id: merchant.id,
      gateway: merchant.gateway,
      isActive: merchant.is_active,
      createdAt: merchant.created_at,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create merchant' });
  }
});

// Deactivate merchant
router.delete('/merchants/:id', requireAuth, requireRole('owner'), tenantIsolation, async (req, res) => {
  try {
    await db('merchants')
      .where({ id: req.params.id, tenant_id: req.context!.tenantId })
      .update({
        is_active: false,
        updated_at: new Date(),
      });

    res.json({ message: 'Merchant deactivated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate merchant' });
  }
});

export default router;
