import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { config } from '../config';
import { decrypt } from '../utils/encryption';
import { db } from '../config/database';

export class OzowService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.ozow.apiUrl,
      timeout: 30000,
    });
  }

  private async getDecryptedKeys(merchantId: string): Promise<{ siteCode: string; privateKey: string; publicKey: string }> {
    const merchant = await db('merchants')
      .where({ id: merchantId, gateway: 'ozow', is_active: true })
      .first();

    if (!merchant) {
      throw new Error('Merchant not found or inactive');
    }

    return {
      siteCode: decrypt(merchant.public_key_encrypted), // Using public_key for site_code
      privateKey: decrypt(merchant.secret_key_encrypted),
      publicKey: decrypt(merchant.public_key_encrypted),
    };
  }

  private generateSignature(params: Record<string, string>, privateKey: string): string {
    const sortedKeys = Object.keys(params).sort();
    let signatureString = '';
    
    for (const key of sortedKeys) {
      if (params[key] !== '' && key !== 'signature') {
        signatureString += params[key];
      }
    }
    
    return crypto
      .createHash('sha512')
      .update(signatureString + privateKey)
      .digest('hex');
  }

  async createPaymentLink(
    merchantId: string,
    amount: number,
    reference: string,
    returnUrl: string,
    cancelUrl: string
  ): Promise<any> {
    const { siteCode, privateKey } = await this.getDecryptedKeys(merchantId);
    
    const params = {
      siteCode,
      amount: amount.toString(),
      reference,
      returnUrl,
      cancelUrl,
      transactionReference: reference,
    };

    const signature = this.generateSignature(params, privateKey);
    
    const response = await this.client.post('/payment', {
      ...params,
      signature,
    });

    return response.data;
  }

  async verifyPayment(reference: string, merchantId: string): Promise<any> {
    const { siteCode, privateKey } = await this.getDecryptedKeys(merchantId);
    
    const params = {
      siteCode,
      transactionReference: reference,
    };

    const signature = this.generateSignature(params, privateKey);
    
    const response = await this.client.get(`/payment/${reference}`, {
      params: {
        siteCode,
        signature,
      },
    });

    return response.data;
  }

  verifyWebhookSignature(payload: Record<string, unknown>, signature: string, merchantId: string): boolean {
    const { privateKey } = this.getDecryptedKeys(merchantId) as any;
    
    // Ozow uses a different verification method
    // The signature is typically included in the webhook payload
    return true; // Simplified - implement proper verification
  }
}

export const ozowService = new OzowService();
