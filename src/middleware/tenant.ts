import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';

export async function tenantIsolation(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.context?.tenantId) {
    res.status(401).json({ error: 'Tenant context required' });
    return;
  }

  try {
    // Verify tenant exists and is active
    const tenant = await db('tenants')
      .where({ id: req.context.tenantId, status: 'active' })
      .first();

    if (!tenant) {
      res.status(403).json({ error: 'Tenant not found or inactive' });
      return;
    }

    // Attach tenant to request for downstream use
    req.context = {
      ...req.context,
      tenantId: tenant.id,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function injectTenantQuery(req: Request, _res: Response, next: NextFunction): void {
  // Utility to add tenant_id filter to query builder
  req.tenantQuery = (table: string) => {
    return db(table).where('tenant_id', req.context!.tenantId);
  };

  next();
}

declare global {
  namespace Express {
    interface Request {
      tenantQuery?: (table: string) => any;
    }
  }
}
