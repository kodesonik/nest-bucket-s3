import { IsOptional, IsString, IsBoolean, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class BackupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: 'full' | 'incremental' | 'differential';

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  collections?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeFiles?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  destination?: string;
} 