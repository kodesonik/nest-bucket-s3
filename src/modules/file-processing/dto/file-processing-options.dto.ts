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

  @ApiPropertyOptional({ description: 'Thumbnail size in pixels' })
  @IsOptional()
  @IsNumber()
  thumbnailSize?: number;

  @ApiPropertyOptional({ description: 'Image quality for optimization (1-100)' })
  @IsOptional()
  @IsNumber()
  imageQuality?: number;

  @ApiPropertyOptional({ description: 'Video processing format' })
  @IsOptional()
  @IsString()
  videoFormat?: string;

  @ApiPropertyOptional({ description: 'Extract text from documents' })
  @IsOptional()
  @IsBoolean()
  extractText?: boolean;
} 