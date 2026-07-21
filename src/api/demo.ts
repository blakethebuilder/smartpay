import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { billingService } from '../services/billing';

const router = Router();

// Simulate payment (demo only - requires auth)
router.post('/simulate-payment', requireAuth, requireRole('owner', 'admin'), async (req: Request, res: Response) => {
  try {
    const { reference } = req.body;
    
    if (!reference) {
      res.status(400).json({ success: false, message: 'Reference is required' });
      return;
    }

    const result = await billingService.simulatePayment(reference);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to simulate payment' });
  }
});

export default router;
