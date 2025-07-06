import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type WebhookDocument = Webhook & Document;

export type WebhookStatus = 'active' | 'paused' | 'disabled' | 'failed';
export type WebhookMethod = 'POST' | 'PUT' | 'PATCH';
export type WebhookContentType = 'application/json' | 'application/x-www-form-urlencoded';
export type WebhookBackoffStrategy = 'linear' | 'exponential' | 'fixed';
export type WebhookEnvironment = 'development' | 'staging' | 'production';
export type WebhookAuthType = 'basic' | 'bearer' | 'custom';

@Schema({ timestamps: true })
export class Webhook {
  @ApiProperty({ description: 'Webhook name' })
  @Prop({ required: true, trim: true })
  name: string;

  @ApiProperty({ description: 'Webhook URL endpoint' })
  @Prop({ required: true, trim: true })
  url: string;

  @ApiProperty({ description: 'Application that owns this webhook' })
  @Prop({ type: Types.ObjectId, ref: 'App', required: true })
  appId: Types.ObjectId;

  @ApiProperty({ description: 'Webhook description' })
  @Prop({ trim: true })
  description?: string;

  @ApiProperty({ description: 'Events this webhook listens to' })
  @Prop([{
    type: String,
    enum: [
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
      '*' // All events
    ]
  }])
  events: string[];

  @ApiProperty({ description: 'Webhook secret for signature verification' })
  @Prop({ required: true })
  secret: string;

  @ApiProperty({ description: 'Webhook status' })
  @Prop({ 
    type: String, 
    enum: ['active', 'paused', 'disabled', 'failed'], 
    default: 'active' 
  })
  status: WebhookStatus;

  @ApiProperty({ description: 'Request timeout in milliseconds' })
  @Prop({ type: Number, default: 10000, min: 1000, max: 30000 })
  timeout: number;

  @ApiProperty({ description: 'Custom HTTP headers to send' })
  @Prop({ type: Map, of: String })
  headers: Map<string, string>;

  @ApiProperty({ description: 'HTTP method to use' })
  @Prop({ 
    type: String, 
    enum: ['POST', 'PUT', 'PATCH'], 
    default: 'POST' 
  })
  method: WebhookMethod;

  @ApiProperty({ description: 'Content type for requests' })
  @Prop({ 
    type: String, 
    enum: ['application/json', 'application/x-www-form-urlencoded'], 
    default: 'application/json' 
  })
  contentType: WebhookContentType;

  @ApiProperty({ description: 'Retry configuration' })
  @Prop({ 
    type: Object, 
    default: {
      enabled: true,
      maxAttempts: 5,
      backoffStrategy: 'exponential',
      initialDelay: 1000,
      maxDelay: 300000
    }
  })
  retryConfig: {
    enabled: boolean;
    maxAttempts: number;
    backoffStrategy: WebhookBackoffStrategy;
    initialDelay: number;
    maxDelay: number;
  };

  @ApiProperty({ description: 'Filter configuration' })
  @Prop({ 
    type: Object, 
    default: {
      fileTypes: [],
      folderPaths: [],
      conditions: []
    }
  })
  filters: {
    fileTypes: string[];
    folderPaths: string[];
    minFileSize?: number;
    maxFileSize?: number;
    conditions: Array<{
      field: string;
      operator: string;
      value: string;
    }>;
  };

  @ApiProperty({ description: 'Webhook delivery statistics' })
  @Prop({ 
    type: Object, 
    default: {
      totalSent: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      successRate: 0,
      averageResponseTime: 0
    }
  })
  statistics: {
    totalSent: number;
    totalSuccessful: number;
    totalFailed: number;
    successRate: number;
    averageResponseTime: number;
    lastSuccessfulDelivery?: Date;
    lastFailedDelivery?: Date;
    lastDeliveryAttempt?: Date;
  };

  @ApiProperty({ description: 'Rate limiting configuration' })
  @Prop({ 
    type: Object, 
    default: {
      enabled: false,
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000
    }
  })
  rateLimit: {
    enabled: boolean;
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };

  @ApiProperty({ description: 'Security configuration' })
  @Prop({ 
    type: Object, 
    default: {
      verifySSL: true,
      allowedIPs: [],
      blockedIPs: [],
      requireAuth: false
    }
  })
  security: {
    verifySSL: boolean;
    allowedIPs: string[];
    blockedIPs: string[];
    requireAuth: boolean;
    authType?: WebhookAuthType;
    authValue?: string;
  };

  @ApiProperty({ description: 'Webhook metadata and custom data' })
  @Prop({ type: Map, of: String })
  metadata: Map<string, string>;

  @ApiProperty({ description: 'Tags for webhook organization' })
  @Prop([{ type: String, trim: true }])
  tags: string[];

  @ApiProperty({ description: 'Webhook environment (dev, staging, prod)' })
  @Prop({ 
    type: String, 
    enum: ['development', 'staging', 'production'], 
    default: 'production' 
  })
  environment: WebhookEnvironment;

  @ApiProperty({ description: 'Webhook version for API compatibility' })
  @Prop({ type: String, default: '1.0' })
  version: string;

  @ApiProperty({ description: 'Whether webhook is active during maintenance' })
  @Prop({ type: Boolean, default: false })
  activeInMaintenance: boolean;

  @ApiProperty({ description: 'Schedule configuration for delayed webhooks' })
  @Prop({ 
    type: Object, 
    default: {
      enabled: false,
      delay: 0,
      timezone: 'UTC'
    }
  })
  schedule: {
    enabled: boolean;
    delay: number;
    cronExpression?: string;
    timezone: string;
  };

  @ApiProperty({ description: 'Transformation rules for payload' })
  @Prop({ 
    type: Object, 
    default: {
      enabled: false,
      includeFields: [],
      excludeFields: [],
      customFields: new Map()
    }
  })
  transformation: {
    enabled: boolean;
    template?: string;
    includeFields: string[];
    excludeFields: string[];
    customFields: Map<string, string>;
  };

  @ApiProperty({ description: 'Webhook creator' })
  @Prop({ required: true })
  createdBy: string;

  @ApiProperty({ description: 'Last updated by' })
  @Prop()
  updatedBy?: string;

  @ApiProperty({ description: 'Last test date' })
  @Prop()
  lastTestedAt?: Date;

  @ApiProperty({ description: 'Last test result' })
  @Prop({ 
    type: Object, 
    required: false
  })
  lastTestResult?: {
    success: boolean;
    responseTime: number;
    statusCode?: number;
    error?: string;
    testedAt: Date;
  };

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export const WebhookSchema = SchemaFactory.createForClass(Webhook);

// Indexes for better performance
WebhookSchema.index({ appId: 1 });
WebhookSchema.index({ status: 1 });
WebhookSchema.index({ events: 1 });
WebhookSchema.index({ environment: 1 });
WebhookSchema.index({ 'statistics.successRate': 1 });
WebhookSchema.index({ 'statistics.lastSuccessfulDelivery': -1 });
WebhookSchema.index({ createdAt: -1 });

// Compound indexes
WebhookSchema.index({ appId: 1, status: 1 });
WebhookSchema.index({ appId: 1, events: 1 });
WebhookSchema.index({ status: 1, environment: 1 });

// Text search index
WebhookSchema.index({ 
  name: 'text', 
  description: 'text', 
  url: 'text' 
}); 