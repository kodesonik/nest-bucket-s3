import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';
import { firstValueFrom } from 'rxjs';
import { Webhook, WebhookDocument, WebhookStatus } from '../../schemas/webhook.schema';
import { WebhookEvent, WebhookEventDocument, WebhookEventStatus } from '../../schemas/webhook-event.schema';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';

export interface WebhookPayload {
  id: string;
  event: string;
  timestamp: Date;
  data: Record<string, any>;
  appId: string;
  version: string;
}

export interface WebhookEventPayload extends WebhookPayload {
  webhookId: Types.ObjectId;
  status: WebhookEventStatus;
  attempts: number;
  maxAttempts: number;
  scheduledFor: Date;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly maxRetries = 5;
  private readonly retryDelays = [1000, 5000, 15000, 60000, 300000]; // 1s, 5s, 15s, 1m, 5m

  constructor(
    @InjectModel(Webhook.name) private webhookModel: Model<WebhookDocument>,
    @InjectModel(WebhookEvent.name) private webhookEventModel: Model<WebhookEventDocument>,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async createWebhook(appId: string, createDto: CreateWebhookDto): Promise<WebhookDocument> {
    const webhook = new this.webhookModel({
      ...createDto,
      appId: new Types.ObjectId(appId),
      secret: this.generateSecret(),
      status: 'active' as WebhookStatus,
      statistics: {
        totalSent: 0,
        totalFailed: 0,
        totalSuccessful: 0,
        lastSuccessfulDelivery: null,
        lastFailedDelivery: null,
      },
    });

    await webhook.save();
    this.logger.log(`Webhook created for app ${appId}: ${webhook.url}`);
    
    return webhook;
  }

  async updateWebhook(
    id: string,
    appId: string,
    updateDto: UpdateWebhookDto,
  ): Promise<WebhookDocument> {
    const webhook = await this.webhookModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        appId: new Types.ObjectId(appId),
      },
      {
        $set: {
          ...updateDto,
          updatedAt: new Date(),
        },
      },
      { new: true },
    ).exec();

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    this.logger.log(`Webhook updated: ${id}`);
    return webhook;
  }

  async deleteWebhook(id: string, appId: string): Promise<void> {
    const result = await this.webhookModel.deleteOne({
      _id: new Types.ObjectId(id),
      appId: new Types.ObjectId(appId),
    }).exec();
    
    if (result.deletedCount === 0) {
      throw new NotFoundException('Webhook not found');
    }

    this.logger.log(`Webhook deleted: ${id}`);
  }

  async getWebhooks(appId: string): Promise<WebhookDocument[]> {
    return this.webhookModel.find({ appId: new Types.ObjectId(appId) }).exec();
  }

  async getWebhook(id: string, appId: string): Promise<WebhookDocument> {
    const webhook = await this.webhookModel.findOne({
      _id: new Types.ObjectId(id),
      appId: new Types.ObjectId(appId),
    }).exec();
    
    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    return webhook;
  }

  async triggerEvent(
    appId: string,
    eventType: string,
    data: Record<string, any>,
    resourceId?: string,
  ): Promise<void> {
    const webhooks = await this.webhookModel.find({
      appId: new Types.ObjectId(appId),
      status: 'active' as WebhookStatus,
      events: eventType,
    }).select('_id retryConfig').lean().exec();

    if (webhooks.length === 0) {
      this.logger.debug(`No active webhooks found for event ${eventType} in app ${appId}`);
      return;
    }

    const basePayload: WebhookPayload = {
      id: crypto.randomUUID(),
      event: eventType,
      timestamp: new Date(),
      data,
      appId: appId.toString(),
      version: '1.0',
    };

    // Create webhook events for each webhook
    const webhookEvents = webhooks.map(webhook => ({
      webhookId: webhook._id,
      appId: new Types.ObjectId(appId),
      eventType,
      payload: basePayload,
      status: 'pending' as WebhookEventStatus,
      attempts: 0,
      maxAttempts: webhook.retryConfig?.maxAttempts || 5,
      scheduledFor: new Date(),
    }));

    await this.webhookEventModel.insertMany(webhookEvents);

    // Process webhooks immediately
    for (const webhook of webhooks) {
      const fullWebhook = await this.webhookModel.findById(webhook._id).exec();
      if (fullWebhook) {
        await this.processWebhookEvent(fullWebhook, basePayload).catch(error => {
          this.logger.error(`Failed to process webhook ${fullWebhook._id}: ${(error as Error).message}`);
        });
      }
    }
  }

  async processWebhookEvent(webhook: WebhookDocument, payload: WebhookPayload): Promise<void> {
    const signature = this.generateSignature(payload, webhook.secret);
    const headers = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Event': payload.event,
      'X-Webhook-ID': payload.id,
      'X-Webhook-Timestamp': payload.timestamp.toISOString(),
      'User-Agent': 'DigitalBucket-Webhook/1.0',
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(webhook.url, payload, {
          headers,
          timeout: webhook.timeout || 10000,
          validateStatus: (status) => status >= 200 && status < 300,
        }),
      );

      await this.handleSuccessfulDelivery(webhook, payload.id, response.status);
      this.logger.log(`Webhook delivered successfully: ${webhook.url} (${response.status})`);

    } catch (error) {
      await this.handleFailedDelivery(webhook, payload.id, error as Error);
      this.logger.error(`Webhook delivery failed: ${webhook.url} - ${(error as Error).message}`);
    }
  }

  async retryFailedWebhooks(): Promise<void> {
    const now = new Date();
    const failedEvents = await this.webhookEventModel.find({
      status: 'failed',
      attemptCount: { $lt: this.maxRetries },
      nextRetryAt: { $lte: now },
    }).populate('webhookId').exec();

    this.logger.log(`Processing ${failedEvents.length} failed webhook events`);

    for (const event of failedEvents) {
      if (!event.webhookId || event.webhookId.status !== 'active') {
        continue;
      }

      try {
        await this.processWebhookEvent(event.webhookId as WebhookDocument, event.payload);
      } catch (error) {
        this.logger.error(`Retry failed for webhook event ${event._id}: ${(error as Error).message}`);
      }
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledWebhooks(): Promise<void> {
    try {
      await this.retryFailedWebhooks();
    } catch (error) {
      this.logger.error(`Error processing scheduled webhooks: ${(error as Error).message}`);
    }
  }

  async getWebhookEvents(
    webhookId: string,
    appId: string,
    options: {
      status?: string;
      page?: number;
      limit?: number;
      from?: Date;
      to?: Date;
    } = {},
  ): Promise<{
    events: WebhookEventDocument[];
    pagination: any;
  }> {
    const { status, page = 1, limit = 50, from, to } = options;
    
    const filter: any = { webhookId, appId };
    
    if (status) {
      filter.status = status;
    }
    
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = from;
      if (to) filter.createdAt.$lte = to;
    }

    const skip = (page - 1) * limit;
    const [events, total] = await Promise.all([
      this.webhookEventModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.webhookEventModel.countDocuments(filter).exec(),
    ]);

    return {
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getWebhookStatistics(
    webhookId: string,
    appId: string,
    period: string = '30d',
  ): Promise<any> {
    const webhook = await this.getWebhook(webhookId, appId);
    const periodStart = this.getPeriodStart(period);

    const stats = await this.webhookEventModel.aggregate([
      {
        $match: {
          webhookId: webhook._id,
          createdAt: { $gte: periodStart },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]).exec();

    const responseTimeStats = await this.webhookEventModel.aggregate([
      {
        $match: {
          webhookId: webhook._id,
          status: 'delivered',
          createdAt: { $gte: periodStart },
        },
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: '$responseTime' },
          minResponseTime: { $min: '$responseTime' },
          maxResponseTime: { $max: '$responseTime' },
        },
      },
    ]).exec();

    const dailyStats = await this.webhookEventModel.aggregate([
      {
        $match: {
          webhookId: webhook._id,
          createdAt: { $gte: periodStart },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.date': 1 },
      },
    ]).exec();

    return {
      summary: {
        totalEvents: stats.reduce((sum, stat) => sum + stat.count, 0),
        successful: stats.find(s => s._id === 'delivered')?.count || 0,
        failed: stats.find(s => s._id === 'failed')?.count || 0,
        pending: stats.find(s => s._id === 'pending')?.count || 0,
      },
      responseTime: responseTimeStats[0] || {
        avgResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
      },
      dailyStats,
      webhook: webhook.statistics,
    };
  }

  async testWebhook(id: string, appId: string): Promise<any> {
    const webhook = await this.getWebhook(id, appId);
    
    const testPayload: WebhookPayload = {
      id: crypto.randomUUID(),
      event: 'webhook.test',
      timestamp: new Date(),
      data: {
        message: 'This is a test webhook from Digital Bucket',
        test: true,
      },
      appId: appId.toString(),
      version: '1.0',
    };

    const startTime = Date.now();
    
    try {
      await this.processWebhookEvent(webhook, testPayload);
      
      return {
        success: true,
        responseTime: Date.now() - startTime,
        message: 'Webhook test successful',
      };
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  async pauseWebhook(id: string, appId: string): Promise<void> {
    await this.webhookModel.updateOne(
      { _id: id, appId },
      { $set: { status: 'paused' } },
    ).exec();
    
    this.logger.log(`Webhook paused: ${id}`);
  }

  async resumeWebhook(id: string, appId: string): Promise<void> {
    await this.webhookModel.updateOne(
      { _id: id, appId },
      { $set: { status: 'active' } },
    ).exec();
    
    this.logger.log(`Webhook resumed: ${id}`);
  }

  // File event triggers
  async onFileUploaded(appId: string, fileData: any): Promise<void> {
    await this.triggerEvent(appId, 'file.uploaded', fileData, fileData.id);
  }

  async onFileDeleted(appId: string, fileData: any): Promise<void> {
    await this.triggerEvent(appId, 'file.deleted', fileData, fileData.id);
  }

  async onFileUpdated(appId: string, fileData: any): Promise<void> {
    await this.triggerEvent(appId, 'file.updated', fileData, fileData.id);
  }

  async onFileDownloaded(appId: string, fileData: any): Promise<void> {
    await this.triggerEvent(appId, 'file.downloaded', fileData, fileData.id);
  }

  async onFolderCreated(appId: string, folderData: any): Promise<void> {
    await this.triggerEvent(appId, 'folder.created', folderData, folderData.id);
  }

  async onQuotaExceeded(appId: string, quotaData: any): Promise<void> {
    await this.triggerEvent(appId, 'quota.exceeded', quotaData);
  }

  async getAvailableEventTypes(): Promise<string[]> {
    return [
      'file.uploaded',
      'file.deleted',
      'file.updated',
      'file.downloaded',
      'folder.created',
      'folder.deleted',
      'folder.updated',
      'quota.exceeded',
      'quota.warning',
      'user.registered',
      'user.login',
      'app.created',
      'app.updated',
      'webhook.test',
      '*'
    ];
  }

  async toggleWebhook(id: string, appId: string): Promise<WebhookDocument> {
    const webhook = await this.getWebhook(id, appId);
    const newStatus = webhook.status === 'active' ? 'paused' : 'active';
    
    await this.webhookModel.updateOne(
      {
        _id: new Types.ObjectId(id),
        appId: new Types.ObjectId(appId),
      },
      { $set: { status: newStatus } }
    ).exec();

    return this.getWebhook(id, appId);
  }

  async retryWebhookEvent(eventId: string, appId: string): Promise<void> {
    const event = await this.webhookEventModel.findOne({ _id: eventId }).exec();
    if (!event) {
      throw new NotFoundException('Webhook event not found');
    }

    const webhook = await this.webhookModel.findById(event.webhookId).exec();
    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    if (webhook.status !== 'active') {
      throw new BadRequestException('Webhook is not active');
    }

    if (event.attempts >= event.maxAttempts) {
      throw new BadRequestException('Maximum retry attempts exceeded');
    }

    // Reset event status
    await this.webhookEventModel.updateOne(
      { _id: eventId },
      {
        $set: {
          status: 'pending',
          scheduledFor: new Date(),
        },
        $inc: { attempts: 1 }
      }
    ).exec();

    // Process the event
    try {
      const typedPayload: WebhookPayload = {
        id: event.payload.id || crypto.randomUUID(),
        event: event.eventType,
        timestamp: event.payload.timestamp || new Date(),
        data: event.payload.data,
        appId: event.appId.toString(),
        version: event.payload.version || '1.0',
      };
      await this.processWebhookEvent(webhook, typedPayload);
    } catch (error) {
      this.logger.error(`Failed to retry webhook event ${eventId}: ${(error as Error).message}`);
      throw error;
    }
  }

  private getRetryCount(event: WebhookEventDocument): number {
    return event.attempts || 0;
  }

  // Private helper methods
  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateSignature(payload: WebhookPayload, secret: string): string {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  async handleSuccessfulDelivery(webhook: WebhookDocument, eventId: string, responseStatus: number): Promise<void> {
    // Update webhook event
    const webhookEvent = await this.webhookEventModel.findOne({
      webhookId: webhook._id,
      'payload.id': eventId,
    }).exec();

    if (!webhookEvent) {
      throw new NotFoundException('Webhook event not found');
    }

    // Update webhook event
    await this.webhookEventModel.findByIdAndUpdate(webhookEvent._id, {
      $set: {
        status: 'delivered' as WebhookEventStatus,
        deliveredAt: new Date(),
        responseStatus,
      },
    }).exec();

    // Update webhook statistics
    await this.webhookModel.findByIdAndUpdate(webhook._id, {
      $inc: {
        'statistics.totalSent': 1,
        'statistics.totalSuccessful': 1,
      },
      $set: {
        'statistics.lastSuccessfulDelivery': new Date(),
        'statistics.lastDeliveryAttempt': new Date(),
      },
    }).exec();
  }

  async handleFailedDelivery(webhook: WebhookDocument, eventId: string, error: Error): Promise<void> {
    const webhookEvent = await this.webhookEventModel.findOne({
      webhookId: webhook._id,
      'payload.id': eventId,
    }).exec();

    if (!webhookEvent) {
      throw new NotFoundException('Webhook event not found');
    }

    const attempts = (webhookEvent.attempts || 0) + 1;
    const maxAttempts = webhookEvent.maxAttempts || 5;
    const status = attempts >= maxAttempts ? 'failed' as WebhookEventStatus : 'pending' as WebhookEventStatus;

    // Update webhook event
    await this.webhookEventModel.findByIdAndUpdate(webhookEvent._id, {
      $set: {
        status,
        attempts,
        errorMessage: error.message,
        failedAt: new Date(),
      },
    }).exec();

    // Update webhook statistics
    await this.webhookModel.findByIdAndUpdate(webhook._id, {
      $inc: {
        'statistics.totalSent': 1,
        'statistics.totalFailed': 1,
      },
      $set: {
        'statistics.lastFailedDelivery': new Date(),
        'statistics.lastDeliveryAttempt': new Date(),
      },
    }).exec();
  }

  private getPeriodStart(period: string): Date {
    const now = new Date();
    switch (period) {
      case '24h':
        now.setHours(now.getHours() - 24);
        break;
      case '7d':
        now.setDate(now.getDate() - 7);
        break;
      case '30d':
      default:
        now.setDate(now.getDate() - 30);
        break;
    }
    return now;
  }
} 