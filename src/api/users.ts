import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { tenantIsolation } from '../middleware/tenant';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import { db } from '../config/database';
import { hashPassword } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const inviteUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(['owner', 'admin', 'user']).default('user'),
  phone: z.string().optional(),
});

const updateRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'user']),
});

// List users for tenant
router.get('/', requireAuth, tenantIsolation, async (req: Request, res: Response) => {
  try {
    const users = await db('users')
      .where({ tenant_id: req.context!.tenantId })
      .select('id', 'email', 'name', 'role', 'phone', 'is_active', 'last_login_at', 'created_at')
      .orderBy('created_at', 'desc');

    res.json(users.map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      phone: u.phone,
      isActive: u.is_active,
      lastLoginAt: u.last_login_at,
      createdAt: u.created_at,
    })));
  } catch (error) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Invite user (creates with temporary password)
router.post('/', requireAuth, requireRole('owner', 'admin'), tenantIsolation, validate(inviteUserSchema), async (req: Request, res: Response) => {
  try {
    const { email, name, role, phone } = req.body;

    // Check if user already exists
    const existing = await db('users')
      .where({ email, tenant_id: req.context!.tenantId })
      .first();

    if (existing) {
      res.status(409).json({ error: 'User already exists in this team' });
      return;
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const passwordHash = await hashPassword(tempPassword);

    const [user] = await db('users')
      .insert({
        id: uuidv4(),
        tenant_id: req.context!.tenantId,
        email,
        name,
        password_hash: passwordHash,
        role,
        phone,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning(['id', 'email', 'name', 'role', 'created_at']);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tempPassword,
      message: `User invited. Temporary password: ${tempPassword}`,
    });
  } catch (error) {
    console.error('Failed to invite user:', error);
    res.status(500).json({ error: 'Failed to invite user' });
  }
});

// Update user role
router.put('/:id/role', requireAuth, requireRole('owner'), tenantIsolation, validate(updateRoleSchema), async (req: Request, res: Response) => {
  try {
    const { role } = req.body;

    // Can't change your own role
    if (req.params.id === req.context!.userId) {
      res.status(400).json({ error: 'Cannot change your own role' });
      return;
    }

    const [updated] = await db('users')
      .where({ id: req.params.id, tenant_id: req.context!.tenantId })
      .update({ role, updated_at: new Date() })
      .returning(['id', 'email', 'name', 'role']);

    if (!updated) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
    });
  } catch (error) {
    console.error('Failed to update role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Deactivate user
router.delete('/:id', requireAuth, requireRole('owner'), tenantIsolation, async (req: Request, res: Response) => {
  try {
    // Can't deactivate yourself
    if (req.params.id === req.context!.userId) {
      res.status(400).json({ error: 'Cannot deactivate yourself' });
      return;
    }

    await db('users')
      .where({ id: req.params.id, tenant_id: req.context!.tenantId })
      .update({ is_active: false, updated_at: new Date() });

    res.json({ message: 'User deactivated' });
  } catch (error) {
    console.error('Failed to deactivate user:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// Reactivate user
router.post('/:id/activate', requireAuth, requireRole('owner'), tenantIsolation, async (req: Request, res: Response) => {
  try {
    await db('users')
      .where({ id: req.params.id, tenant_id: req.context!.tenantId })
      .update({ is_active: true, updated_at: new Date() });

    res.json({ message: 'User activated' });
  } catch (error) {
    console.error('Failed to activate user:', error);
    res.status(500).json({ error: 'Failed to activate user' });
  }
});

export default router;
