import { IsArray, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ArchiveFormat {
  ZIP = 'zip',
  TAR = 'tar',
  TAR_GZ = 'tar.gz',
}

export class CreateArchiveDto {
  @ApiProperty({ description: 'Array of file IDs to include in archive' })
  @IsArray()
  @IsString({ each: true })
  fileIds: string[];

  @ApiProperty({ description: 'Name for the archive file' })
  @IsString()
  archiveName: string;

  @ApiPropertyOptional({ description: 'Archive format', enum: ArchiveFormat })
  @IsOptional()
  @IsEnum(ArchiveFormat)
  format?: ArchiveFormat;

  @ApiPropertyOptional({ description: 'Include folder structure in archive' })
  @IsOptional()
  includeFolders?: boolean;
} 