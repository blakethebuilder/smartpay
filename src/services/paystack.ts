import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { config } from '../config';
import { decrypt, hashWebhookPayload } from '../utils/encryption';
import { db } from '../config/database';

export class PaystackService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.paystack.co',
      timeout: 30000,
    });
  }

  private async getDecryptedKeys(merchantId: string): Promise<{ publicKey: string; secretKey: string }> {
    const merchant = await db('merchants')
      .where({ id: merchantId, gateway: 'paystack', is_active: true })
      .first();

    if (!merchant) {
      throw new Error('Merchant not found or inactive');
    }

    return {
      publicKey: decrypt(merchant.public_key_encrypted),
      secretKey: decrypt(merchant.secret_key_encrypted),
    };
  }

  async initializeTransaction(
    merchantId: string,
    amount: number,
    email: string,
    metadata: Record<string, unknown> = {}
  ): Promise<any> {
    const { secretKey } = await this.getDecryptedKeys(merchantId);
    
    const response = await this.client.post(
      '/transaction/initialize',
      {
        amount: amount * 100, // Paystack uses kobo/cents
        email,
        metadata,
        callback_url: `${config.env === 'production' ? 'https' : 'http'}://${config.env === 'production' ? 'api.smartpay.com' : 'localhost:3000'}/payments/paystack/callback`,
      },
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );

    return response.data;
  }

  async verifyTransaction(reference: string, merchantId: string): Promise<any> {
    const { secretKey } = await this.getDecryptedKeys(merchantId);
    
    const response = await this.client.get(`/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    return response.data;
  }

  verifyWebhookSignature(payload: string, signature: string, merchantId: string): boolean {
    // For webhook verification, we use the general Paystack secret
    // In production, each merchant should have their own webhook secret
    const hash = crypto
      .createHmac('sha512', config.paystack.webhookSecret)
      .update(payload)
      .digest('hex');
    
    return hash === signature;
  }
}

export const paystackService = new PaystackService();
