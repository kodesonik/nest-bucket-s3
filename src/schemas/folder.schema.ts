import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type FolderDocument = Folder & Document;

@Schema({ timestamps: true })
export class Folder {
  @ApiProperty({ description: 'Folder name' })
  @Prop({ required: true, trim: true })
  name: string;

  @ApiProperty({ description: 'Folder path (unique within app)' })
  @Prop({ required: true, trim: true })
  path: string;

  @ApiProperty({ description: 'Folder description' })
  @Prop({ trim: true })
  description?: string;

  @ApiProperty({ description: 'Parent folder' })
  @Prop({ type: Types.ObjectId, ref: 'Folder' })
  parentId?: Types.ObjectId;

  @ApiProperty({ description: 'Application that owns this folder' })
  @Prop({ type: Types.ObjectId, ref: 'App', required: true })
  appId: Types.ObjectId;

  @ApiProperty({ description: 'Folder color for UI' })
  @Prop({ trim: true })
  color?: string;

  @ApiProperty({ description: 'Folder icon for UI' })
  @Prop({ trim: true })
  icon?: string;

  @ApiProperty({ description: 'Folder visibility' })
  @Prop({ 
    type: String, 
    enum: ['public', 'private', 'shared'], 
    default: 'private' 
  })
  visibility: string;

  @ApiProperty({ description: 'Folder status' })
  @Prop({ 
    type: String, 
    enum: ['active', 'archived', 'deleted'], 
    default: 'active' 
  })
  status: string;

  @ApiProperty({ description: 'Folder statistics' })
  @Prop({
    fileCount: { type: Number, default: 0 },
    totalSize: { type: Number, default: 0 },
    subfolderCount: { type: Number, default: 0 },
    lastActivity: { type: Date },
  })
  stats: {
    fileCount: number;
    totalSize: number;
    subfolderCount: number;
    lastActivity?: Date;
  };

  @ApiProperty({ description: 'Folder settings' })
  @Prop({
    autoSort: { type: String, enum: ['name', 'date', 'size', 'type'], default: 'name' },
    sortOrder: { type: String, enum: ['asc', 'desc'], default: 'asc' },
    defaultView: { type: String, enum: ['grid', 'list'], default: 'grid' },
    allowUploads: { type: Boolean, default: true },
    maxFileSize: { type: Number },
    allowedFileTypes: [{ type: String }],
  })
  settings: {
    autoSort: string;
    sortOrder: string;
    defaultView: string;
    allowUploads: boolean;
    maxFileSize?: number;
    allowedFileTypes: string[];
  };

  @ApiProperty({ description: 'Folder tags' })
  @Prop([{ type: String, trim: true }])
  tags: string[];

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export const FolderSchema = SchemaFactory.createForClass(Folder);

// Indexes for better performance
FolderSchema.index({ appId: 1, path: 1 }, { unique: true });
FolderSchema.index({ appId: 1, parentId: 1 });
FolderSchema.index({ appId: 1, status: 1 });
FolderSchema.index({ name: 'text', description: 'text' }); 