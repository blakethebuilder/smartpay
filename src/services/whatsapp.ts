import { db } from '../config/database';
import { WhatsAppInstance, Message } from '../types';
import { evolutionApi } from './evolutionApi';
import { v4 as uuidv4 } from 'uuid';

export class WhatsAppService {
  async createInstance(tenantId: string, instanceName: string): Promise<WhatsAppInstance> {
    // Sanitize instance name for Evolution API (lowercase, alphanumeric, hyphens only)
    const sanitizedName = instanceName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Create instance in Evolution API
    const evolutionInstance = await evolutionApi.createInstance(sanitizedName, tenantId);

    // Store in database with original name
    const [instance] = await db('whatsapp_instances')
      .insert({
        id: uuidv4(),
        tenant_id: tenantId,
        instance_name: `${tenantId}-${sanitizedName}`,
        instance_id: evolutionInstance.instance?.instanceId || '',
        status: 'connecting',
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    return this.mapInstance(instance);
  }

  async getQRCode(instanceId: string, tenantId: string): Promise<any> {
    const instance = await db('whatsapp_instances')
      .where({ id: instanceId, tenant_id: tenantId })
      .first();

    if (!instance) {
      throw new Error('Instance not found');
    }

    const qrCode = await evolutionApi.getQRCode(instance.instance_name);
    return qrCode;
  }

  async getStatus(instanceId: string, tenantId: string): Promise<any> {
    const instance = await db('whatsapp_instances')
      .where({ id: instanceId, tenant_id: tenantId })
      .first();

    if (!instance) {
      throw new Error('Instance not found');
    }

    const status = await evolutionApi.getInstanceStatus(instance.instance_name);
    
    // Update status in database
    await db('whatsapp_instances')
      .where({ id: instanceId })
      .update({
        status: status.state === 'open' ? 'connected' : 'disconnected',
        updated_at: new Date(),
      });

    return status;
  }

  async sendMessage(
    tenantId: string,
    instanceId: string,
    customerId: string,
    content: string,
    type: 'text' | 'media' = 'text',
    mediaUrl?: string
  ): Promise<Message> {
    // Verify instance belongs to tenant
    const instance = await db('whatsapp_instances')
      .where({ id: instanceId, tenant_id: tenantId })
      .first();

    if (!instance) {
      throw new Error('Instance not found');
    }

    if (instance.status !== 'connected') {
      throw new Error('Instance not connected');
    }

    // Get customer phone
    const customer = await db('customers')
      .where({ id: customerId, tenant_id: tenantId })
      .first();

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Send via Evolution API
    let result;
    if (type === 'media' && mediaUrl) {
      result = await evolutionApi.sendMedia(instance.instance_name, customer.phone, mediaUrl, content);
    } else {
      result = await evolutionApi.sendMessage(instance.instance_name, customer.phone, content);
    }

    // Store message
    const [message] = await db('messages')
      .insert({
        id: uuidv4(),
        tenant_id: tenantId,
        instance_id: instanceId,
        customer_id: customerId,
        type,
        content,
        status: 'sent',
        sent_at: new Date(),
        created_at: new Date(),
      })
      .returning('*');

    return this.mapMessage(message);
  }

  async handleWebhook(eventType: string, payload: Record<string, unknown>): Promise<void> {
    // Handle different webhook events
    switch (eventType) {
      case 'MESSAGES_UPSERT':
        await this.handleIncomingMessage(payload);
        break;
      case 'CONNECTION_UPDATE':
        await this.handleConnectionUpdate(payload);
        break;
      case 'QRCODE_UPDATED':
        await this.handleQRCodeUpdate(payload);
        break;
    }
  }

  private async handleIncomingMessage(payload: Record<string, unknown>): Promise<void> {
    // Process incoming messages
    // TODO: Implement incoming message handling
    console.log('Incoming message:', payload);
  }

  private async handleConnectionUpdate(payload: Record<string, unknown>): Promise<void> {
    const instanceName = payload.instance as string;
    const connected = payload.state === 'open';

    await db('whatsapp_instances')
      .where({ instance_name: instanceName })
      .update({
        status: connected ? 'connected' : 'disconnected',
        updated_at: new Date(),
      });
  }

  private async handleQRCodeUpdate(payload: Record<string, unknown>): Promise<void> {
    // QR code updated - could notify frontend via WebSocket
    console.log('QR Code updated:', payload);
  }

  private mapInstance(row: any): WhatsAppInstance {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      instanceName: row.instance_name,
      instanceId: row.instance_id,
      status: row.status,
      phoneNumber: row.phone_number,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapMessage(row: any): Message {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      instanceId: row.instance_id,
      customerId: row.customer_id,
      type: row.type,
      content: row.content,
      status: row.status,
      sentAt: row.sent_at,
      createdAt: row.created_at,
    };
  }
}

export const whatsappService = new WhatsAppService();
