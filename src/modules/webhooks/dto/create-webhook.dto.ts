import { IsString, IsArray, IsBoolean, IsOptional, IsObject, IsNumber, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWebhookDto {
  @ApiProperty({ description: 'Application ID that owns this webhook' })
  @IsString()
  appId: string;

  @ApiProperty({ description: 'Webhook URL endpoint' })
  @IsUrl()
  url: string;

  @ApiProperty({ description: 'Events to listen for' })
  @IsArray()
  @IsString({ each: true })
  events: string[];

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