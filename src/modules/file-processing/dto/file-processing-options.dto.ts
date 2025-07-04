import { IsOptional, IsBoolean, IsNumber, IsString, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FileProcessingOptionsDto {
  @ApiPropertyOptional({ description: 'Generate thumbnail for image/video files' })
  @IsOptional()
  @IsBoolean()
  generateThumbnail?: boolean;

  @ApiPropertyOptional({ description: 'Optimize image files' })
  @IsOptional()
  @IsBoolean()
  optimizeImage?: boolean;

  @ApiPropertyOptional({ description: 'Extract metadata from files' })
  @IsOptional()
  @IsBoolean()
  extractMetadata?: boolean;

  @ApiPropertyOptional({ description: 'Perform virus scan on files' })
  @IsOptional()
  @IsBoolean()
  virusScan?: boolean;

  @ApiPropertyOptional({ description: 'Preserve original file' })
  @IsOptional()
  @IsBoolean()
  preserveOriginal?: boolean;

  @ApiPropertyOptional({ description: 'Target folder for file storage' })
  @IsOptional()
  @IsString()
  folder?: string;

  @ApiPropertyOptional({ description: 'Analyze file content' })
  @IsOptional()
  @IsBoolean()
  analyzeContent?: boolean;

  @ApiPropertyOptional({ description: 'Compress video files' })
  @IsOptional()
  @IsBoolean()
  compressVideo?: boolean;

  @ApiPropertyOptional({ description: 'Perform OCR on documents' })
  @IsOptional()
  @IsBoolean()
  performOCR?: boolean;

  @ApiPropertyOptional({ description: 'Analyze archive contents' })
  @IsOptional()
  @IsBoolean()
  analyzeArchive?: boolean;

  @ApiPropertyOptional({ description: 'Extract archive contents' })
  @IsOptional()
  @IsBoolean()
  extractArchive?: boolean;

  @ApiPropertyOptional({ description: 'Maximum image width' })
  @IsOptional()
  @IsNumber()
  maxWidth?: number;

  @ApiPropertyOptional({ description: 'Maximum image height' })
  @IsOptional()
  @IsNumber()
  maxHeight?: number;

  @ApiPropertyOptional({ description: 'Image quality (1-100)' })
  @IsOptional()
  @IsNumber()
  quality?: number;

  @ApiPropertyOptional({ description: 'Thumbnail width' })
  @IsOptional()
  @IsNumber()
  thumbnailWidth?: number;

  @ApiPropertyOptional({ description: 'Thumbnail height' })
  @IsOptional()
  @IsNumber()
  thumbnailHeight?: number;

  @ApiPropertyOptional({ description: 'Extract text from documents' })
  @IsOptional()
  @IsBoolean()
  extractText?: boolean;
} 