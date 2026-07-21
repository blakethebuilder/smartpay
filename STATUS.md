# SmartPay - Project Status

## Overview
Multi-tenant SaaS platform for automated billing and WhatsApp communications for SMEs.

**Stack:** Node.js/Express + PostgreSQL + Evolution API + Next.js  
**Region:** South Africa (ZAR - South African Rand)  
**Domain:** https://smartpay.smartintegrate.co.za  
**API:** https://payapi.smartintegrate.co.za  
**GitHub:** https://github.com/blakethebuilder/smartpay

---

## Current Status: v0.3.0 - LIVE (Deployed)

### Backend (✅ Complete)
- [x] Express server with TypeScript
- [x] PostgreSQL database with migrations
- [x] Multi-tenant data isolation (tenant_id FK on all tables)
- [x] JWT authentication (register/login/change password)
- [x] Zod validation on all endpoints
- [x] Rate limiting (100 req/15min)
- [x] Error handling middleware
- [x] AES-256-GCM encryption for gateway credentials
- [x] Evolution API integration (WhatsApp)
- [x] Paystack integration
- [x] Ozow integration
- [x] Idempotent webhook handling

### Anti-Ban & Humanization (✅ Complete)
- [x] Message queue with random jitter (3-7s delays between messages)
- [x] Typing indicator before sending messages (scales with message length)
- [x] Business hours throttling (08:00-18:00 SAST)
- [x] Priority queue (high/normal/low)

### Dunning Automation (✅ Complete)
- [x] Auto-reminders after 24h/48h/72h unpaid invoices
- [x] Configurable reminder messages per tenant
- [x] Dunning logs for tracking
- [x] Auto-cancel when invoice paid

### Payment Gateways (🇿🇦 South Africa)
| Gateway | Status | Payment Methods |
|---------|--------|-----------------|
| Paystack | ✅ Live | Cards, Bank Transfer, USSD |
| Ozow | ✅ Live | Instant EFT |
| Payflex | 🔜 Coming Soon | Buy Now Pay Later |
| PayJustNow | 🔜 Coming Soon | Buy Now Pay Later |

### Database (✅ Complete - 12 tables)
- [x] tenants, merchants, whatsapp_instances
- [x] customers, invoices, payments, messages
- [x] webhook_events, dunning_rules, dunning_logs
- [x] Foreign keys with CASCADE delete
- [x] Indexes for performance
- [x] Check constraints on enums

### Frontend (✅ Complete - 13 pages)
- [x] Login/Register with JWT auth
- [x] Dashboard with stats, recent invoices, quick actions
- [x] Customer management (list, create, search)
- [x] Invoice management (list, create, filter by status)
- [x] Invoice upload (PDF placeholder, Sage/Xero coming soon)
- [x] Payment link generation with gateway selection
- [x] WhatsApp instance management with QR codes
- [x] Payment gateway credentials (Settings)
- [x] Payment history with revenue summary
- [x] Quick payment request modal

### DevOps (✅ Complete)
- [x] Dockerfile (multi-stage build)
- [x] docker-compose.yml for production
- [x] Auto-migrations on deploy
- [x] SSL via Let's Encrypt
- [x] Evolution API connected (10.0.1.64:8080)

---

## Deployment (Dockploy VPS)

| Service | Domain | Port |
|---------|--------|------|
| Frontend | smartpay.smartintegrate.co.za | 3010 |
| Backend | payapi.smartintegrate.co.za | 3011 |
| PostgreSQL | internal | 5432 |
| Evolution API | whatsapp.smartintegrate.co.za | 8080 |

---

## API Endpoints

### Authentication
| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/v1/auth/register` | POST | No |
| `/api/v1/auth/login` | POST | No |
| `/api/v1/auth/me` | GET | Yes |
| `/api/v1/auth/change-password` | POST | Yes |

### Tenants
| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/v1/tenants/profile` | GET/PUT | Yes |
| `/api/v1/tenants/merchants` | GET/POST | Yes |
| `/api/v1/tenants/merchants/:id` | DELETE | Yes |

### Customers
| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/v1/customers` | GET/POST | Yes |
| `/api/v1/customers/:id` | GET/PUT/DELETE | Yes |

### Invoices
| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/v1/invoices` | GET/POST | Yes |
| `/api/v1/invoices/gateways` | GET | Yes |
| `/api/v1/invoices/payment-link` | POST | Yes |

### WhatsApp
| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/v1/whatsapp/instances` | GET/POST | Yes |
| `/api/v1/whatsapp/instances/:id/qr` | GET | Yes |
| `/api/v1/whatsapp/messages` | GET/POST | Yes |

### Messaging (Anti-Ban)
| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/v1/messaging/send` | POST | Yes |
| `/api/v1/messaging/queue/status` | GET | Yes |
| `/api/v1/messaging/queue/:jobId` | DELETE | Yes |

### Dunning
| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/v1/messaging/dunning` | GET/PUT | Yes |
| `/api/v1/messaging/dunning/logs/:invoiceId` | GET | Yes |
| `/api/v1/messaging/dunning/cancel/:invoiceId` | POST | Yes |

### Webhooks
| Endpoint | Method | Auth |
|----------|--------|------|
| `/webhooks/paystack` | POST | Signature |
| `/webhooks/ozow` | POST | None |
| `/webhooks/whatsapp` | POST | None |

---

## Git History

```
e514a43 Fix dunning migration: convert to CommonJS format
1fa97a5 Add anti-ban features and dunning automation
e16992b Fix Dockerfile: copy migrations folder in build stage
a1d2c2d Rename API subdomain to payapi.smartintegrate.co.za
0ef1f5e Fix API URL: use api.smartintegrate.co.za for production
7d0cf28 Fix API URL: use runtime origin instead of build-time env var
b6edff2 Fix migrations: use plain JavaScript instead of TypeScript
c8d5ed7 Fix frontend Dockerfile: use env PORT instead of hardcoded
87de763 Fix migrations: use compiled JS files instead of TypeScript
2f567e2 Fix migrations: add knexfile.js and auto-run on deploy
658e4ea Update Evolution API URL to Dockploy network IP (10.0.1.64)
5d8a8d5 Fix docker-compose.yml for Dockploy
a861959 Update domain to smartpay.smartintegrate.co.za
8bb3d0c Fix docker-compose: remove deprecated version attribute
f1ffb95 Initial commit: SmartPay multi-tenant billing platform
```

---

## Next Steps (Phase 2)

1. **Instant Payment Receipts** - Auto-send branded confirmation on webhook
2. **Interactive WhatsApp Buttons** - Card UI with Pay Now button
3. **Audit Trail** - Customer interaction timeline in dashboard
4. **Invoice Upload** - PDF parsing and auto-extraction
5. **Sage/Xero Integration** - Import invoices from accounting software
6. **Payflex/PayJustNow** - Add BNPL payment options

---

## File Structure

```
smartpay/
├── src/
│   ├── api/          # 8 route modules (auth, tenants, customers, invoices, whatsapp, webhooks, demo, messaging)
│   ├── services/     # 7 service classes (billing, evolutionApi, ozow, paystack, whatsapp, messageQueue, dunning)
│   ├── middleware/    # Auth, tenant, validation, errors
│   ├── config/       # Database, env config
│   ├── types/        # TypeScript interfaces
│   └── utils/        # Encryption, format helpers
├── migrations/       # JavaScript migrations (CommonJS)
├── frontend/         # Next.js + Tailwind app
├── docker-compose.yml
├── Dockerfile
├── knexfile.js
├── .env.production
├── DEPLOY.md
└── STATUS.md
```
