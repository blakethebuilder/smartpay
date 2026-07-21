# SmartPay Deployment Guide

## Prerequisites
- Docker & Docker Compose installed on VPS
- Domain pointed to VPS IP
- SSL certificate (via Let's Encrypt or Cloudflare)

## 1. Clone Repository

```bash
cd /opt
git clone https://github.com/blakethebuilder/smartpay.git
cd smartpay
```

## 2. Configure Environment

```bash
cp .env.production .env
nano .env
```

Fill in:
- `DB_PASSWORD` - Generate: `openssl rand -hex 32`
- `JWT_SECRET` - Generate: `openssl rand -hex 32`
- `ENCRYPTION_KEY` - Generate: `openssl rand -hex 16`
- Domain URLs for `ALLOWED_ORIGINS` and `NEXT_PUBLIC_API_URL`

## 3. Deploy

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

## 4. Run Migrations

```bash
docker-compose -f docker-compose.prod.yml exec backend npm run migrate
```

## 5. Create Admin Account

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Your Business","email":"admin@yourdomain.co.za","password":"YourSecurePassword","phone":"+27821234567"}'
```

## 6. Nginx Reverse Proxy (Optional)

```nginx
# /etc/nginx/sites-available/smartpay

server {
    listen 80;
    server_name api.yourdomain.co.za;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.co.za;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.co.za/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.co.za/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name app.yourdomain.co.za;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.yourdomain.co.za;

    ssl_certificate /etc/letsencrypt/live/app.yourdomain.co.za/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.co.za/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 7. Webhooks

Configure these webhook URLs in your payment gateway dashboards:

- **Paystack**: `https://api.yourdomain.co.za/webhooks/paystack`
- **Ozow**: `https://api.yourdomain.co.za/webhooks/ozow`

## 8. Evolution API

Since SmartPay and Evolution API are on the same VPS, use internal network:
- Backend → Evolution API: `http://localhost:8080`

## Useful Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Stop all
docker-compose -f docker-compose.prod.yml down

# Update
git pull
docker-compose -f docker-compose.prod.yml up -d --build
```
