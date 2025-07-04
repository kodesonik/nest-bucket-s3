import { IsString, IsArray, IsBoolean, IsOptional, IsObject, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateWebhookDto {
  @ApiPropertyOptional({ description: 'Webhook URL endpoint' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ description: 'Events to listen for' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  events?: string[];

  @ApiPropertyOptional({ description: 'Webhook secret for signature validation' })
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiPropertyOptional({ description: 'Whether webhook is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Webhook settings' })
  @IsOptional()
  @IsObject()
  settings?: {
    retryPolicy?: {
      maxAttempts?: number;
      retryDelay?: number;
      backoffMultiplier?: number;
    };
    timeout?: number;
    rateLimiting?: {
      requestsPerMinute?: number;
    };
    filters?: {
      fileTypes?: string[];
      minFileSize?: number;
      maxFileSize?: number;
      pathPattern?: string;
    };
  };
} 