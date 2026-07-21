interface MessageJob {
  id: string;
  tenantId: string;
  instanceId: string;
  customerId: string;
  customerPhone: string;
  content: string;
  type: 'text' | 'media' | 'template';
  mediaUrl?: string;
  priority: 'high' | 'normal' | 'low';
  scheduledAt?: Date;
  metadata?: Record<string, unknown>;
}

interface QueueConfig {
  minDelay: number;  // ms
  maxDelay: number;  // ms
  typingDuration: number;  // ms
  businessHoursOnly: boolean;
  businessHoursStart: number;  // 0-23
  businessHoursEnd: number;    // 0-23
  maxRetries: number;
}

const DEFAULT_CONFIG: QueueConfig = {
  minDelay: 3000,    // 3 seconds
  maxDelay: 7000,    // 7 seconds
  typingDuration: 3000,  // 3 seconds typing indicator
  businessHoursOnly: false, // Disabled for now - enable in production
  businessHoursStart: 8,   // 8 AM SAST
  businessHoursEnd: 18,    // 6 PM SAST
  maxRetries: 3,
};

export class MessageQueue {
  private queue: MessageJob[] = [];
  private processing = false;
  private config: QueueConfig;
  private activeJobs = new Map<string, { startedAt: Date; job: MessageJob }>();

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private isBusinessHours(): boolean {
    if (!this.config.businessHoursOnly) return true;

    // Get current time in SAST (UTC+2)
    const now = new Date();
    const sastHour = (now.getUTCHours() + 2) % 24;

    return sastHour >= this.config.businessHoursStart && sastHour < this.config.businessHoursEnd;
  }

  private getRandomDelay(): number {
    return Math.floor(
      Math.random() * (this.config.maxDelay - this.config.minDelay + 1) + this.config.minDelay
    );
  }

  private calculateTypingDuration(messageLength: number): number {
    // Scale typing duration based on message length
    const baseDuration = this.config.typingDuration;
    const lengthFactor = Math.min(messageLength / 200, 1); // Max 2x for long messages
    return Math.floor(baseDuration + (baseDuration * lengthFactor));
  }

  async addJob(job: Omit<MessageJob, 'id'>): Promise<string> {
    const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullJob: MessageJob = { ...job, id };

    // Check business hours
    if (this.config.businessHoursOnly && !this.isBusinessHours()) {
      // Schedule for next business hours
      const scheduledAt = this.getNextBusinessHours();
      fullJob.scheduledAt = scheduledAt;
      console.log(`Job ${id} scheduled for ${scheduledAt.toISOString()} (outside business hours)`);
    }

    this.queue.push(fullJob);
    this.queue.sort((a, b) => {
      // Priority order: high > normal > low
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    console.log(`Job ${id} added to queue. Queue size: ${this.queue.length}`);
    return id;
  }

  private getNextBusinessHours(): Date {
    const now = new Date();
    const sastNow = new Date(now.getTime() + 2 * 60 * 60 * 1000); // Convert to SAST
    const currentHour = sastNow.getUTCHours();

    if (currentHour < this.config.businessHoursStart) {
      // Before business hours - schedule for today
      sastNow.setUTCHours(this.config.businessHoursStart, 0, 0, 0);
    } else if (currentHour >= this.config.businessHoursEnd) {
      // After business hours - schedule for tomorrow
      sastNow.setDate(sastNow.getDate() + 1);
      sastNow.setUTCHours(this.config.businessHoursStart, 0, 0, 0);
    }

    // Convert back to UTC
    return new Date(sastNow.getTime() - 2 * 60 * 60 * 1000);
  }

  async processNext(sendMessage: (job: MessageJob) => Promise<boolean>): Promise<boolean> {
    if (this.processing || this.queue.length === 0) return false;

    this.processing = true;

    try {
      // Find next job that's ready to process
      const now = new Date();
      const readyIndex = this.queue.findIndex(job => {
        if (job.scheduledAt && job.scheduledAt > now) return false;
        return true;
      });

      if (readyIndex === -1) {
        this.processing = false;
        return false;
      }

      const job = this.queue[readyIndex];
      this.activeJobs.set(job.id, { startedAt: new Date(), job });

      // Wait for random delay
      const delay = this.getRandomDelay();
      console.log(`Job ${job.id}: Waiting ${delay}ms before sending...`);
      await this.sleep(delay);

      // Send message
      const success = await sendMessage(job);

      // Remove from queue
      this.queue.splice(readyIndex, 1);
      this.activeJobs.delete(job.id);

      console.log(`Job ${job.id}: ${success ? 'sent successfully' : 'failed'}`);

      this.processing = false;
      return success;
    } catch (error) {
      this.processing = false;
      console.error('Queue processing error:', error);
      return false;
    }
  }

  getJob(id: string): MessageJob | undefined {
    return this.queue.find(j => j.id === id) || this.activeJobs.get(id)?.job;
  }

  removeJob(id: string): boolean {
    const index = this.queue.findIndex(j => j.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getActiveJobs(): MessageJob[] {
    return Array.from(this.activeJobs.values()).map(aj => aj.job);
  }

  isBusinessHoursNow(): boolean {
    return this.isBusinessHours();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const messageQueue = new MessageQueue();
