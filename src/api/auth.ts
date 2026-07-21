import { Router } from 'express';
import { z } from 'zod';
import { db } from '../config/database';
import { generateToken, hashPassword, comparePasswords, requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  phone: z.string().min(10).max(15).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

// Register new tenant
router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if email already exists
    const existing = await db('tenants').where({ email }).first();
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    // Create tenant
    const tenantId = uuidv4();
    const hashedPassword = await hashPassword(password);

    await db('tenants').insert({
      id: tenantId,
      name,
      email,
      phone,
      status: 'active',
      password_hash: hashedPassword,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Generate token
    const token = generateToken({
      tenantId,
      email,
      role: 'owner',
    });

    res.status(201).json({
      tenant: {
        id: tenantId,
        name,
        email,
        phone,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register tenant' });
  }
});

// Login
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find tenant
    const tenant = await db('tenants').where({ email }).first();
    if (!tenant) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Check password
    const valid = await comparePasswords(password, tenant.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Check status
    if (tenant.status !== 'active') {
      res.status(403).json({ error: 'Account is suspended' });
      return;
    }

    // Generate token
    const token = generateToken({
      tenantId: tenant.id,
      email: tenant.email,
      role: 'owner',
    });

    res.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get current user
router.get('/me', requireAuth, async (req, res) => {
  try {
    const tenant = await db('tenants')
      .where({ id: req.context!.tenantId })
      .select('id', 'name', 'email', 'phone', 'status', 'created_at')
      .first();

    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Change password
router.post('/change-password', requireAuth, validate(changePasswordSchema), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const tenant = await db('tenants').where({ id: req.context!.tenantId }).first();
    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    const valid = await comparePasswords(currentPassword, tenant.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    const hashedPassword = await hashPassword(newPassword);
    await db('tenants')
      .where({ id: req.context!.tenantId })
      .update({
        password_hash: hashedPassword,
        updated_at: new Date(),
      });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
