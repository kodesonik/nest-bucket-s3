import { IsOptional, IsString, IsBoolean, IsArray, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FileProcessingOptionsDto } from '../../file-processing/dto/file-processing-options.dto';

export class UploadMultipleFilesDto {
  @ApiPropertyOptional({ description: 'Folder path to upload files to' })
  @IsOptional()
  @IsString()
  folderPath?: string;

  @ApiPropertyOptional({ description: 'Common tags for all files' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Make all files publicly accessible' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Processing options for all files' })
  @IsOptional()
  @IsObject()
  processing?: FileProcessingOptionsDto;

  @ApiPropertyOptional({ description: 'Additional metadata for all files' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
} 