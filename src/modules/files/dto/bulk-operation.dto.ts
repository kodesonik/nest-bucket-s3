import { IsArray, IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BulkOperationType {
  DELETE = 'delete',
  MOVE = 'move',
  TAG = 'tag',
  MAKE_PUBLIC = 'make_public',
  MAKE_PRIVATE = 'make_private',
  ARCHIVE = 'archive',
}

export class BulkOperationDto {
  @ApiProperty({ description: 'Array of file IDs to operate on' })
  @IsArray()
  @IsString({ each: true })
  fileIds: string[];

  @ApiProperty({ description: 'Type of bulk operation', enum: BulkOperationType })
  @IsEnum(BulkOperationType)
  operation: BulkOperationType;

  @ApiPropertyOptional({ description: 'Operation-specific options' })
  @IsOptional()
  @IsObject()
  options?: {
    folderPath?: string; // for move operation
    tags?: string[]; // for tag operation
    archiveName?: string; // for archive operation
  };
} 