import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ 
    description: 'Current password',
    format: 'password'
  })
  @IsString()
  @MinLength(1, { message: 'Current password is required' })
  currentPassword: string;

  @ApiProperty({ 
    description: 'New password (minimum 8 characters, must contain uppercase, lowercase, number and special character)',
    example: 'MyNewSecureP@ssw0rd',
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
  newPassword: string;
}

export class ResetPasswordDto {
  @ApiProperty({ 
    description: 'Password reset token',
    example: 'abc123def456'
  })
  @IsString()
  @MinLength(1, { message: 'Reset token is required' })
  token: string;

  @ApiProperty({ 
    description: 'New password',
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
  newPassword: string;
}

export class RequestPasswordResetDto {
  @ApiProperty({ 
    description: 'User email address',
    example: 'user@example.com'
  })
  @IsString()
  @MinLength(1, { message: 'Email is required' })
  email: string;
}

export class Enable2FADto {
  @ApiProperty({ 
    description: 'Current password for verification',
    format: 'password'
  })
  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password: string;
}

export class Verify2FADto {
  @ApiProperty({ 
    description: '6-digit 2FA code',
    example: '123456'
  })
  @IsString()
  @MinLength(6, { message: 'Code must be 6 digits' })
  @MaxLength(6, { message: 'Code must be 6 digits' })
  code: string;
} 