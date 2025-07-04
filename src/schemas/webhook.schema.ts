import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type WebhookDocument = Webhook & Document;

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
  status: string;

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
  method: string;

  @ApiProperty({ description: 'Content type for requests' })
  @Prop({ 
    type: String, 
    enum: ['application/json', 'application/x-www-form-urlencoded'], 
    default: 'application/json' 
  })
  contentType: string;

  @ApiProperty({ description: 'Retry configuration' })
  @Prop({
    enabled: { type: Boolean, default: true },
    maxAttempts: { type: Number, default: 5, min: 1, max: 10 },
    backoffStrategy: { 
      type: String, 
      enum: ['linear', 'exponential', 'fixed'], 
      default: 'exponential' 
    },
    initialDelay: { type: Number, default: 1000 }, // milliseconds
    maxDelay: { type: Number, default: 300000 }, // 5 minutes
  })
  retryConfig: {
    enabled: boolean;
    maxAttempts: number;
    backoffStrategy: string;
    initialDelay: number;
    maxDelay: number;
  };

  @ApiProperty({ description: 'Filter configuration' })
  @Prop({
    fileTypes: [{ type: String }], // Filter by file types
    folderPaths: [{ type: String }], // Filter by folder paths
    minFileSize: { type: Number }, // Minimum file size in bytes
    maxFileSize: { type: Number }, // Maximum file size in bytes
    conditions: [{
      field: { type: String },
      operator: { type: String, enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'contains'] },
      value: { type: String }
    }]
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
    totalSent: { type: Number, default: 0 },
    totalSuccessful: { type: Number, default: 0 },
    totalFailed: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 },
    lastSuccessfulDelivery: { type: Date },
    lastFailedDelivery: { type: Date },
    lastDeliveryAttempt: { type: Date },
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
    enabled: { type: Boolean, default: false },
    requestsPerMinute: { type: Number, default: 60 },
    requestsPerHour: { type: Number, default: 1000 },
    requestsPerDay: { type: Number, default: 10000 },
  })
  rateLimit: {
    enabled: boolean;
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };

  @ApiProperty({ description: 'Security configuration' })
  @Prop({
    verifySSL: { type: Boolean, default: true },
    allowedIPs: [{ type: String }], // IP whitelist
    blockedIPs: [{ type: String }], // IP blacklist
    requireAuth: { type: Boolean, default: false },
    authType: { type: String, enum: ['basic', 'bearer', 'custom'] },
    authValue: { type: String },
  })
  security: {
    verifySSL: boolean;
    allowedIPs: string[];
    blockedIPs: string[];
    requireAuth: boolean;
    authType?: string;
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
  environment: string;

  @ApiProperty({ description: 'Webhook version for API compatibility' })
  @Prop({ type: String, default: '1.0' })
  version: string;

  @ApiProperty({ description: 'Whether webhook is active during maintenance' })
  @Prop({ type: Boolean, default: false })
  activeInMaintenance: boolean;

  @ApiProperty({ description: 'Schedule configuration for delayed webhooks' })
  @Prop({
    enabled: { type: Boolean, default: false },
    delay: { type: Number, default: 0 }, // Delay in milliseconds
    cronExpression: { type: String }, // For scheduled webhooks
    timezone: { type: String, default: 'UTC' },
  })
  schedule: {
    enabled: boolean;
    delay: number;
    cronExpression?: string;
    timezone: string;
  };

  @ApiProperty({ description: 'Transformation rules for payload' })
  @Prop({
    enabled: { type: Boolean, default: false },
    template: { type: String }, // JSON template for payload transformation
    includeFields: [{ type: String }], // Fields to include
    excludeFields: [{ type: String }], // Fields to exclude
    customFields: { type: Map, of: String }, // Custom fields to add
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
    success: { type: Boolean },
    responseTime: { type: Number },
    statusCode: { type: Number },
    error: { type: String },
    testedAt: { type: Date },
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