import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiVersion: process.env.API_VERSION || 'v1',

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'smartpay',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'changeme',
  },

  evolutionApi: {
    url: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
    key: process.env.EVOLUTION_API_KEY || '',
  },

  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY || '',
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
    webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || '',
  },

  ozow: {
    siteCode: process.env.OZOW_SITE_CODE || '',
    privateKey: process.env.OZOW_PRIVATE_KEY || '',
    publicKey: process.env.OZOW_PUBLIC_KEY || '',
    apiUrl: process.env.OZOW_API_URL || 'https://pay.ozow.com/api',
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY || 'default_key_change_in_production',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
};
