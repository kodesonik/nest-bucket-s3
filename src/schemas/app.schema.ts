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
  @Prop({ type: Array, default: [] })
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
    type: Object, 
    default: {
      maxFileSize: 104857600, // 100MB
      maxFilesPerDay: 1000,
      maxStorageSize: 10737418240, // 10GB
      allowedFileTypes: []
    }
  })
  limits: {
    maxFileSize: number;
    maxFilesPerDay: number;
    maxStorageSize: number;
    allowedFileTypes: string[];
  };

  @ApiProperty({ description: 'Application usage statistics' })
  @Prop({ 
    type: Object, 
    default: {
      totalFiles: 0,
      totalSize: 0,
      apiCalls: 0
    }
  })
  usage: {
    totalFiles: number;
    totalSize: number;
    apiCalls: number;
    lastActivity?: Date;
  };

  @ApiProperty({ description: 'Application settings' })
  @Prop({ 
    type: Object, 
    default: {
      autoDeleteTempFiles: true,
      tempFileRetentionDays: 7,
      generateThumbnails: true,
      compressImages: true,
      allowPublicAccess: false
    }
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