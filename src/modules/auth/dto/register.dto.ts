import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ 
    description: 'User email address',
    example: 'user@example.com',
    format: 'email'
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({ 
    description: 'User full name',
    example: 'John Doe',
    minLength: 2,
    maxLength: 100
  })
  @IsString()
  @MinLength(2, { message: 'Full name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Full name must not exceed 100 characters' })
  fullName: string;

  @ApiProperty({ 
    description: 'User password (minimum 8 characters, must contain uppercase, lowercase, number and special character)',
    example: 'MySecureP@ssw0rd',
    minLength: 8,
    maxLength: 128,
    format: 'password'
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { message: 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character' }
  )
  password: string;

  @ApiProperty({ 
    description: 'Company name (optional)',
    example: 'Acme Corp',
    required: false
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  company?: string;

  @ApiProperty({ 
    description: 'Accept terms and conditions',
    example: true
  })
  @IsBoolean()
  acceptTerms: boolean;

  @ApiProperty({ 
    description: 'Accept privacy policy',
    example: true
  })
  @IsBoolean()
  acceptPrivacy: boolean;

  @ApiProperty({ 
    description: 'Marketing consent (optional)',
    example: false,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;
} 