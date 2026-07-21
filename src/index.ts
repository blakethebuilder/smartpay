import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './api/auth';
import tenantRoutes from './api/tenants';
import customerRoutes from './api/customers';
import invoiceRoutes from './api/invoices';
import whatsappRoutes from './api/whatsapp';
import webhookRoutes from './api/webhooks';
import demoRoutes from './api/demo';
import messagingRoutes from './api/messaging';
import whatsappSyncRoutes from './api/whatsappSync';

const app = express();

// Trust proxy (required for rate limiting behind Dockploy/Nginx)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use(`/api/${config.apiVersion}/auth`, authRoutes);
app.use(`/api/${config.apiVersion}/tenants`, tenantRoutes);
app.use(`/api/${config.apiVersion}/customers`, customerRoutes);
app.use(`/api/${config.apiVersion}/invoices`, invoiceRoutes);
app.use(`/api/${config.apiVersion}/whatsapp`, whatsappRoutes);
app.use(`/api/${config.apiVersion}/messaging`, messagingRoutes);
app.use(`/api/${config.apiVersion}/whatsapp-sync`, whatsappSyncRoutes);

// Webhook routes (no auth required)
app.use('/webhooks', webhookRoutes);

// Demo routes (no auth required)
app.use('/api/v1/demo', demoRoutes);

// HTML escape function to prevent XSS
function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Demo payment page (no auth required - for testing)
app.get('/pay/demo/:reference', async (req, res) => {
  const reference = escapeHtml(req.params.reference);
  const gateway = escapeHtml(req.query.gateway as string || '');
  const amount = parseFloat(req.query.amount as string) || 0;
  const currency = escapeHtml(req.query.currency as string || 'ZAR');

  const gatewayName = gateway === 'paystack' ? 'Paystack'
    : gateway === 'ozow' ? 'Ozow'
    : gateway === 'payflex' ? 'Payflex'
    : gateway === 'payjustnow' ? 'PayJustNow'
    : 'Unknown';

  const formattedAmount = currency === 'ZAR' 
    ? `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
    : `${currency} ${amount.toLocaleString()}`;

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>SmartPay - Payment Demo</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .card { background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); padding: 40px; max-width: 420px; width: 100%; }
        .logo { text-align: center; margin-bottom: 24px; }
        .logo h1 { color: #16a34a; font-size: 28px; }
        .amount { text-align: center; margin: 24px 0; }
        .amount .value { font-size: 36px; font-weight: 700; color: #1f2937; }
        .amount .gateway { display: inline-block; margin-top: 8px; padding: 6px 16px; background: #f3f4f6; border-radius: 20px; font-size: 14px; color: #6b7280; }
        .details { background: #f9fafb; border-radius: 8px; padding: 16px; margin: 24px 0; }
        .details .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .details .row:last-child { margin-bottom: 0; }
        .details .label { color: #6b7280; }
        .details .value { color: #1f2937; font-weight: 500; }
        .btn { width: 100%; padding: 14px; background: #16a34a; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 16px; }
        .btn:hover { background: #15803d; }
        .btn:disabled { background: #9ca3af; cursor: not-allowed; }
        .btn.secondary { background: transparent; color: #6b7280; border: 1px solid #e5e7eb; margin-top: 8px; }
        .btn.secondary:hover { background: #f3f4f6; }
        .status { text-align: center; padding: 16px; border-radius: 8px; margin-top: 16px; display: none; }
        .status.success { display: block; background: #dcfce7; color: #166534; }
        .status.error { display: block; background: #fee2e2; color: #991b1b; }
        .note { text-align: center; font-size: 12px; color: #9ca3af; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">
          <h1>SmartPay</h1>
        </div>
        <div class="amount">
          <div class="value">${formattedAmount}</div>
          <div class="gateway">${gatewayName}</div>
        </div>
        <div class="details">
          <div class="row">
            <span class="label">Reference</span>
            <span class="value">${reference}</span>
          </div>
          <div class="row">
            <span class="label">Payment Method</span>
            <span class="value">${gatewayName}</span>
          </div>
          <div class="row">
            <span class="label">Status</span>
            <span class="value">Pending</span>
          </div>
        </div>
        <div id="status" class="status"></div>
        <button id="payBtn" class="btn" onclick="simulatePayment()">
          Pay Now (Demo)
        </button>
        <button class="btn secondary" onclick="window.history.back()">
          Cancel
        </button>
        <p class="note">This is a demo payment page. No real payment will be processed.</p>
      </div>
      <script>
        async function simulatePayment() {
          const btn = document.getElementById('payBtn');
          const status = document.getElementById('status');
          btn.disabled = true;
          btn.textContent = 'Processing...';
          
          try {
            const response = await fetch('/api/v1/demo/simulate-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reference: '${reference}' })
            });
            const data = await response.json();
            
            if (data.success) {
              status.className = 'status success';
              status.textContent = 'Payment successful! This invoice has been marked as paid.';
              btn.textContent = 'Paid!';
            } else {
              status.className = 'status error';
              status.textContent = data.message || 'Payment failed. Please try again.';
              btn.disabled = false;
              btn.textContent = 'Pay Now (Demo)';
            }
          } catch (error) {
            status.className = 'status error';
            status.textContent = 'An error occurred. Please try again.';
            btn.disabled = false;
            btn.textContent = 'Pay Now (Demo)';
          }
        }
      </script>
    </body>
    </html>
  `);
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`SmartPay server running on port ${PORT}`);
  console.log(`Environment: ${config.env}`);
  console.log(`API version: ${config.apiVersion}`);
});

export default app;
