import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type AppDocument = App & Document;

@Schema({ timestamps: true })
export class App {
  @ApiProperty({ description: 'Application name' })
  @Prop({ required: true, trim: true })
  name: string;

  @ApiProperty({ description: 'Application description' })
  @Prop({ trim: true })
  description?: string;

  @ApiProperty({ description: 'Application domain/URL' })
  @Prop({ trim: true })
  domain?: string;

  @ApiProperty({ description: 'Application status' })
  @Prop({ 
    type: String, 
    enum: ['active', 'inactive', 'suspended'], 
    default: 'active' 
  })
  status: string;

  @ApiProperty({ description: 'Application API keys' })
  @Prop([{
    keyId: { type: String, required: true, unique: true },
    keyName: { type: String, required: true },
    keyHash: { type: String, required: true },
    permissions: [{
      type: String,
      enum: ['read', 'write', 'delete', 'admin'],
    }],
    lastUsed: { type: Date },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  }])
  apiKeys: Array<{
    keyId: string;
    keyName: string;
    keyHash: string;
    permissions: string[];
    lastUsed?: Date;
    isActive: boolean;
    createdAt: Date;
  }>;

  @ApiProperty({ description: 'Application usage limits' })
  @Prop({
    maxFileSize: { type: Number, default: 104857600 }, // 100MB
    maxFilesPerDay: { type: Number, default: 1000 },
    maxStorageSize: { type: Number, default: 10737418240 }, // 10GB
    allowedFileTypes: [{ type: String }],
  })
  limits: {
    maxFileSize: number;
    maxFilesPerDay: number;
    maxStorageSize: number;
    allowedFileTypes: string[];
  };

  @ApiProperty({ description: 'Application usage statistics' })
  @Prop({
    totalFiles: { type: Number, default: 0 },
    totalSize: { type: Number, default: 0 },
    apiCalls: { type: Number, default: 0 },
    lastActivity: { type: Date },
  })
  usage: {
    totalFiles: number;
    totalSize: number;
    apiCalls: number;
    lastActivity?: Date;
  };

  @ApiProperty({ description: 'Application settings' })
  @Prop({
    autoDeleteTempFiles: { type: Boolean, default: true },
    tempFileRetentionDays: { type: Number, default: 7 },
    generateThumbnails: { type: Boolean, default: true },
    compressImages: { type: Boolean, default: true },
    allowPublicAccess: { type: Boolean, default: false },
    webhookUrl: { type: String },
    webhookSecret: { type: String },
  })
  settings: {
    autoDeleteTempFiles: boolean;
    tempFileRetentionDays: number;
    generateThumbnails: boolean;
    compressImages: boolean;
    allowPublicAccess: boolean;
    webhookUrl?: string;
    webhookSecret?: string;
  };

  @ApiProperty({ description: 'Application owner/creator' })
  @Prop({ required: true })
  createdBy: string;

  @ApiProperty({ description: 'Last updated by' })
  @Prop()
  updatedBy?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export const AppSchema = SchemaFactory.createForClass(App);

// Indexes for better performance
AppSchema.index({ 'apiKeys.keyId': 1 });
AppSchema.index({ status: 1 });
AppSchema.index({ createdBy: 1 });
AppSchema.index({ 'usage.lastActivity': 1 }); 