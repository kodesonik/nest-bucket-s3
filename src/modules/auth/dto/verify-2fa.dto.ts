import { IsNotEmpty, IsString, IsOptional, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Verify2FADto {
  @ApiProperty({
    description: '6-digit TOTP code from authenticator app',
    example: '123456',
  })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6, { message: 'TOTP code must be exactly 6 digits' })
  token: string;

  @ApiPropertyOptional({
    description: 'Backup code (alternative to TOTP token)',
    example: 'backup-code-12345',
  })
  @IsOptional()
  @IsString()
  backupCode?: string;
} 