import { IsOptional, IsNumber, IsBoolean, IsString, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SystemConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxFileSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxFilesPerDay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedFileTypes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maintenanceMessage?: string;
} 