import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { tenantIsolation } from '../middleware/tenant';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import { db } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Validation schemas
const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(15),
  metadata: z.record(z.unknown()).optional(),
});

const updateCustomerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(15).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// List customers
router.get('/', requireAuth, tenantIsolation, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;

    const customers = await db('customers')
      .where({ tenant_id: req.context!.tenantId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db('customers')
      .where({ tenant_id: req.context!.tenantId })
      .count('* as count');

    res.json({
      customers: customers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        metadata: c.metadata ? JSON.parse(c.metadata) : undefined,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
      pagination: {
        page,
        limit,
        total: parseInt(count as string),
        pages: Math.ceil(parseInt(count as string) / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Get customer by ID
router.get('/:id', requireAuth, tenantIsolation, async (req, res) => {
  try {
    const customer = await db('customers')
      .where({ id: req.params.id, tenant_id: req.context!.tenantId })
      .first();

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    res.json({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      metadata: customer.metadata ? JSON.parse(customer.metadata) : undefined,
      createdAt: customer.created_at,
      updatedAt: customer.updated_at,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Create customer
router.post('/', requireAuth, tenantIsolation, validate(createCustomerSchema), async (req, res) => {
  try {
    const [customer] = await db('customers')
      .insert({
        id: uuidv4(),
        tenant_id: req.context!.tenantId,
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        metadata: req.body.metadata ? JSON.stringify(req.body.metadata) : null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    res.status(201).json({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      metadata: customer.metadata ? JSON.parse(customer.metadata) : undefined,
      createdAt: customer.created_at,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Update customer
router.put('/:id', requireAuth, tenantIsolation, validate(updateCustomerSchema), async (req, res) => {
  try {
    const updates: Record<string, unknown> = { updated_at: new Date() };
    
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.email !== undefined) updates.email = req.body.email;
    if (req.body.phone !== undefined) updates.phone = req.body.phone;
    if (req.body.metadata !== undefined) updates.metadata = JSON.stringify(req.body.metadata);

    const [customer] = await db('customers')
      .where({ id: req.params.id, tenant_id: req.context!.tenantId })
      .update(updates)
      .returning('*');

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    res.json({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      metadata: customer.metadata ? JSON.parse(customer.metadata) : undefined,
      createdAt: customer.created_at,
      updatedAt: customer.updated_at,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Delete customer (soft delete)
router.delete('/:id', requireAuth, tenantIsolation, async (req, res) => {
  try {
    await db('customers')
      .where({ id: req.params.id, tenant_id: req.context!.tenantId })
      .update({ deleted_at: new Date() });

    res.json({ message: 'Customer deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

export default router;
