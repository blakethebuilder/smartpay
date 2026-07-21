# SmartPay - Multi-Tenant SaaS Platform

Multi-tenant SaaS platform for automated billing and WhatsApp communications for SMEs.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      SmartPay Platform                      │
├─────────────────────────────────────────────────────────────┤
│  API Layer (Express.js)                                     │
│  ├── /api/v1/tenants      - Tenant management              │
│  ├── /api/v1/customers    - Customer management             │
│  ├── /api/v1/invoices     - Invoice & billing               │
│  ├── /api/v1/whatsapp     - WhatsApp instances & messaging  │
│  └── /webhooks            - Payment & WhatsApp webhooks     │
├─────────────────────────────────────────────────────────────┤
│  Services Layer                                             │
│  ├── EvolutionApiService  - WhatsApp via Evolution API      │
│  ├── PaystackService      - Paystack payments               │
│  ├── OzowService          - Ozow payments                   │
│  ├── BillingService       - Invoice & payment orchestration │
│  └── WhatsAppService      - WhatsApp instance management    │
├─────────────────────────────────────────────────────────────┤
│  Data Layer (PostgreSQL)                                    │
│  ├── Tenants, Merchants  - Multi-tenant isolation           │
│  ├── Customers           - Per-tenant customer data         │
│  ├── Invoices, Payments  - Billing & payment tracking       │
│  ├── Messages            - WhatsApp message history         │
│  └── WebhookEvents       - Idempotent webhook processing    │
└─────────────────────────────────────────────────────────────┘
```

## Features

- **Multi-Tenancy**: Strict data isolation with tenant_id foreign keys
- **Payment Gateways**: Paystack and Ozow integration with encrypted merchant credentials
- **WhatsApp**: Evolution API integration for multi-tenant WhatsApp instances
- **Idempotency**: Webhook processing with deduplication via webhook_events table
- **Security**: Encrypted gateway credentials, rate limiting, input validation

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Run migrations
npm run migrate

# Start development server
npm run dev
```

## Database Schema

| Table | Description |
|-------|-------------|
| `tenants` | Tenant accounts with status |
| `merchants` | Encrypted payment gateway credentials per tenant |
| `whatsapp_instances` | WhatsApp instance connections |
| `customers` | Customer records per tenant |
| `invoices` | Invoice records with status tracking |
| `payments` | Payment attempts linked to invoices |
| `messages` | WhatsApp message history |
| `webhook_events` | Idempotent webhook event storage |

## API Endpoints

### Tenants
- `GET /api/v1/tenants/profile` - Get tenant profile
- `PUT /api/v1/tenants/profile` - Update tenant profile
- `GET /api/v1/tenants/merchants` - List payment gateways
- `POST /api/v1/tenants/merchants` - Add payment gateway

### Customers
- `GET /api/v1/customers` - List customers (paginated)
- `POST /api/v1/customers` - Create customer
- `GET /api/v1/customers/:id` - Get customer
- `PUT /api/v1/customers/:id` - Update customer

### Invoices
- `GET /api/v1/invoices` - List invoices
- `POST /api/v1/invoices` - Create invoice
- `POST /api/v1/invoices/payment-link` - Generate payment link

### WhatsApp
- `GET /api/v1/whatsapp/instances` - List instances
- `POST /api/v1/whatsapp/instances` - Create instance
- `GET /api/v1/whatsapp/instances/:id/qr` - Get QR code
- `POST /api/v1/whatsapp/messages` - Send message

### Webhooks (No Auth)
- `POST /webhooks/paystack` - Paystack payment events
- `POST /webhooks/ozow` - Ozow payment events
- `POST /webhooks/whatsapp` - WhatsApp events

## Multi-Tenancy Model

```
Tenant A ──┬── Merchants (Paystack credentials)
            ├── WhatsApp Instance(s)
            ├── Customers
            ├── Invoices ── Payments
            └── Messages
            
Tenant B ──┬── Merchants (Ozow credentials)
            ├── WhatsApp Instance(s)
            ├── Customers
            ├── Invoices ── Payments
            └── Messages
```

Each tenant's data is isolated via `tenant_id` foreign keys. Payment gateway credentials are encrypted per-merchant.
