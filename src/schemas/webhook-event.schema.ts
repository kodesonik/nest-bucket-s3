import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WebhookEventDocument = WebhookEvent & Document;

@Schema({ timestamps: true })
export class WebhookEvent {
  @Prop({ type: Types.ObjectId, ref: 'Webhook', required: true, index: true })
  webhookId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'App', required: true, index: true })
  appId: Types.ObjectId;

  @Prop({ required: true, index: true })
  eventType: string;

  @Prop({ type: Object, required: true })
  payload: Record<string, any>;

  @Prop({ 
    required: true, 
    enum: ['pending', 'delivered', 'failed', 'cancelled'], 
    default: 'pending',
    index: true 
  })
  status: string;

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ default: 5 })
  maxAttempts: number;

  @Prop()
  nextRetryAt: Date;

  @Prop({ index: true })
  scheduledFor: Date;

  @Prop()
  deliveredAt: Date;

  @Prop()
  failedAt: Date;

  @Prop()
  responseStatus: number;

  @Prop()
  responseBody: string;

  @Prop()
  responseHeaders: Record<string, string>;

  @Prop()
  errorMessage: string;

  @Prop()
  processingStartedAt: Date;

  @Prop()
  processingEndedAt: Date;

  @Prop()
  responseTime: number;

  @Prop({ type: [String] })
  tags: string[];

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const WebhookEventSchema = SchemaFactory.createForClass(WebhookEvent);

// Indexes for performance
WebhookEventSchema.index({ webhookId: 1, createdAt: -1 });
WebhookEventSchema.index({ status: 1, nextRetryAt: 1 });
WebhookEventSchema.index({ appId: 1, eventType: 1 });
WebhookEventSchema.index({ scheduledFor: 1 });
WebhookEventSchema.index({ createdAt: -1 });

// TTL index to automatically delete old events after 30 days
WebhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); 