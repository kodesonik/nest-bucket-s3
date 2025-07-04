import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Enable2FADto {
  @ApiProperty({
    description: 'Current user password for verification',
    example: 'CurrentPassword123!',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;
} 