import { IsOptional, IsString, IsBoolean, IsArray, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FileProcessingOptionsDto } from '../../file-processing/dto/file-processing-options.dto';

export class UploadFileDto {
  @ApiPropertyOptional({ description: 'Folder path to upload file to' })
  @IsOptional()
  @IsString()
  folderPath?: string;

  @ApiPropertyOptional({ description: 'File description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'File tags for organization' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Make file publicly accessible' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Processing options for the file' })
  @IsOptional()
  @IsObject()
  processing?: FileProcessingOptionsDto;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
} 