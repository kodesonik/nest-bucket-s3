import { IsOptional, IsString, IsNumber, IsBoolean, IsArray, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum FileSortBy {
  NAME = 'name',
  SIZE = 'size',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  TYPE = 'type',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class GetFilesQueryDto {
  @ApiPropertyOptional({ description: 'Page number (1-based)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: 'Number of items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: 'Search term for file names' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by file type' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Filter by folder path' })
  @IsOptional()
  @IsString()
  folderPath?: string;

  @ApiPropertyOptional({ description: 'Filter by tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Sort field', enum: FileSortBy })
  @IsOptional()
  @IsEnum(FileSortBy)
  sortBy?: FileSortBy;

  @ApiPropertyOptional({ description: 'Sort order', enum: SortOrder })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;

  @ApiPropertyOptional({ description: 'Filter by public status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPublic?: boolean;
} 