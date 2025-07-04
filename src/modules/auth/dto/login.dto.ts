import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ 
    description: 'User email address',
    example: 'user@example.com'
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({ 
    description: 'User password',
    example: 'MySecureP@ssw0rd',
    format: 'password'
  })
  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password: string;

  @ApiProperty({ 
    description: 'Two-factor authentication code (if enabled)',
    example: '123456',
    required: false
  })
  @IsOptional()
  @IsString()
  twoFactorCode?: string;

  @ApiProperty({ 
    description: 'Remember this device',
    example: false,
    required: false
  })
  @IsOptional()
  rememberMe?: boolean;
} 