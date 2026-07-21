import axios, { AxiosInstance } from 'axios';
import { config } from '../config';

export class EvolutionApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.evolutionApi.url,
      headers: {
        'apikey': config.evolutionApi.key,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async fetchInstances(): Promise<any[]> {
    const response = await this.client.get('/instance/fetchInstances');
    return response.data;
  }

  async createInstance(instanceName: string, tenantId: string): Promise<any> {
    const webhookUrl = process.env.EVOLUTION_WEBHOOK_URL || 
      `${config.env === 'production' ? 'https' : 'http'}://${config.env === 'production' ? 'payapi.smartintegrate.co.za' : 'localhost:3000'}/webhooks/whatsapp`;

    const response = await this.client.post('/instance/create', {
      instanceName: `${tenantId}-${instanceName}`,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
      webhook: {
        enabled: true,
        url: webhookUrl,
        byEvents: false,
        base64: false,
        events: [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'CONNECTION_UPDATE',
          'QRCODE_UPDATED',
        ],
      },
    });
    return response.data;
  }

  async getInstanceStatus(instanceName: string): Promise<any> {
    const response = await this.client.get(`/instance/connectionState/${instanceName}`);
    return response.data;
  }

  async getQRCode(instanceName: string): Promise<any> {
    const response = await this.client.get(`/instance/connect/${instanceName}`);
    return response.data;
  }

  async sendPresence(instanceName: string, to: string, presence: 'composing' | 'recording' | 'paused'): Promise<any> {
    try {
      const response = await this.client.post(`/chat/sendPresence/${instanceName}`, {
        number: to,
        presence,
        delay: 3000,
      });
      return response.data;
    } catch (error) {
      // Presence errors are non-fatal, continue with message
      return null;
    }
  }

  async sendMessage(instanceName: string, to: string, message: string, useTypingIndicator: boolean = true): Promise<any> {
    if (useTypingIndicator) {
      // Send typing indicator
      await this.sendPresence(instanceName, to, 'composing');

      // Calculate typing duration based on message length
      const typingDuration = Math.min(2000 + (message.length * 10), 5000);
      await new Promise(resolve => setTimeout(resolve, typingDuration));

      // Stop typing indicator
      await this.sendPresence(instanceName, to, 'paused');
    }

    const response = await this.client.post(`/message/sendText/${instanceName}`, {
      number: to,
      text: message,
    });
    return response.data;
  }

  async sendText(instanceName: string, to: string, message: string): Promise<any> {
    const response = await this.client.post(`/message/sendText/${instanceName}`, {
      number: to,
      text: message,
    });
    return response.data;
  }

  async sendMedia(
    instanceName: string,
    to: string,
    mediaUrl: string,
    caption?: string
  ): Promise<any> {
    const response = await this.client.post(`/message/sendMedia/${instanceName}`, {
      number: to,
      mediatype: 'image',
      media: mediaUrl,
      caption: caption || '',
    });
    return response.data;
  }

  async disconnectInstance(instanceName: string): Promise<any> {
    const response = await this.client.delete(`/instance/logout/${instanceName}`);
    return response.data;
  }

  async deleteInstance(instanceName: string): Promise<any> {
    const response = await this.client.delete(`/instance/delete/${instanceName}`);
    return response.data;
  }
}

export const evolutionApi = new EvolutionApiService();
