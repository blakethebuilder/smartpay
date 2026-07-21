import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { tenantIsolation } from '../middleware/tenant';
import { evolutionApi } from '../services/evolutionApi';
import { db } from '../config/database';

const router = Router();

// Sync instances from Evolution API to database
router.post('/sync', requireAuth, tenantIsolation, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context!.tenantId;

    // Fetch all instances from Evolution API
    const evoInstances = await evolutionApi.fetchInstances();

    // Get current instances in database
    const dbInstances = await db('whatsapp_instances')
      .where({ tenant_id: tenantId });

    // Update status for each instance
    for (const dbInstance of dbInstances) {
      const evoInstance = evoInstances.find(
        (e: any) => e.name === dbInstance.instance_name
      );

      if (evoInstance) {
        const newStatus = evoInstance.connectionStatus === 'open' ? 'connected' : 'disconnected';
        if (dbInstance.status !== newStatus) {
          await db('whatsapp_instances')
            .where({ id: dbInstance.id })
            .update({
              status: newStatus,
              phone_number: evoInstance.ownerJid?.split('@')[0] || dbInstance.phone_number,
              updated_at: new Date(),
            });
        }
      }
    }

    // Return updated instances
    const updated = await db('whatsapp_instances')
      .where({ tenant_id: tenantId })
      .orderBy('created_at', 'desc');

    res.json({
      synced: updated.length,
      instances: updated.map((i: any) => ({
        id: i.id,
        instanceName: i.instance_name,
        status: i.status,
        phoneNumber: i.phone_number,
      })),
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Failed to sync instances' });
  }
});

export default router;
