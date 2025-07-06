import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type FileDocument = File & Document;

@Schema({ timestamps: true })
export class File {
  @ApiProperty({ description: 'Original filename' })
  @Prop({ required: true, trim: true })
  originalName: string;

  @ApiProperty({ description: 'Stored filename (unique)' })
  @Prop({ required: true, unique: true })
  filename: string;

  @ApiProperty({ description: 'File MIME type' })
  @Prop({ required: true })
  mimeType: string;

  @ApiProperty({ description: 'File size in bytes' })
  @Prop({ required: true, min: 0 })
  size: number;

  @ApiProperty({ description: 'File storage URL' })
  @Prop({ required: true })
  url: string;

  @ApiProperty({ description: 'File storage key/path' })
  @Prop({ required: true })
  key: string;

  @ApiProperty({ description: 'File folder/directory' })
  @Prop({ type: Types.ObjectId, ref: 'Folder' })
  folderId?: Types.ObjectId;

  @ApiProperty({ description: 'Folder path string' })
  @Prop({ trim: true })
  folderPath?: string;

  @ApiProperty({ description: 'Application that owns this file' })
  @Prop({ type: Types.ObjectId, ref: 'App', required: true })
  appId: Types.ObjectId;

  @ApiProperty({ description: 'File type category' })
  @Prop({ 
    type: String, 
    enum: ['image', 'video', 'document', 'archive', 'audio', 'other'],
    required: true 
  })
  type: string;

  @ApiProperty({ description: 'File status' })
  @Prop({ 
    type: String, 
    enum: ['active', 'deleted', 'processing', 'failed'], 
    default: 'active' 
  })
  status: string;

  @ApiProperty({ description: 'File metadata and processing information' })
  @Prop({ 
    type: Object, 
    default: {}
  })
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    bitrate?: number;
    fps?: number;
    colorSpace?: string;
    hasAlpha?: boolean;
    compression?: string;
    pages?: number;
    thumbnailUrl?: string;
    thumbnailKey?: string;
    optimizedUrl?: string;
    optimizedKey?: string;
  };

  @ApiProperty({ description: 'File processing options' })
  @Prop({ 
    type: Object, 
    default: {
      generateThumbnail: false,
      optimizeImage: false,
      extractMetadata: true,
      virusScan: false
    }
  })
  processing: {
    generateThumbnail: boolean;
    optimizeImage: boolean;
    extractMetadata: boolean;
    virusScan: boolean;
  };

  @ApiProperty({ description: 'File access and security settings' })
  @Prop({ 
    type: Object, 
    default: {
      isPublic: false,
      downloadCount: 0
    }
  })
  access: {
    isPublic: boolean;
    accessToken?: string;
    expiresAt?: Date;
    password?: string;
    downloadCount: number;
    maxDownloads?: number;
  };

  @ApiProperty({ description: 'File tags for organization' })
  @Prop([{ type: String, trim: true }])
  tags: string[];

  @ApiProperty({ description: 'File description or notes' })
  @Prop({ trim: true })
  description?: string;

  @ApiProperty({ description: 'IP address of uploader' })
  @Prop()
  uploadedFromIp?: string;

  @ApiProperty({ description: 'User agent of uploader' })
  @Prop()
  uploadedUserAgent?: string;

  @ApiProperty({ description: 'File upload source' })
  @Prop({ 
    type: String, 
    enum: ['api', 'dashboard', 'webhook', 'migration'], 
    default: 'api' 
  })
  uploadSource: string;

  @ApiProperty({ description: 'Last access timestamp' })
  @Prop()
  lastAccessed?: Date;

  @ApiProperty({ description: 'File deletion timestamp (soft delete)' })
  @Prop()
  deletedAt?: Date;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export const FileSchema = SchemaFactory.createForClass(File);

// Indexes for better performance
FileSchema.index({ appId: 1 });
FileSchema.index({ folderId: 1 });
FileSchema.index({ type: 1 });
FileSchema.index({ status: 1 });
FileSchema.index({ 'access.isPublic': 1 });
FileSchema.index({ tags: 1 });
FileSchema.index({ createdAt: -1 });
FileSchema.index({ filename: 1 }, { unique: true });
FileSchema.index({ key: 1 }, { unique: true }); 