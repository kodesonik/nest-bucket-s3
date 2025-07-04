import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FileProcessingService } from './file-processing.service';
import { StorageService } from '../storage/storage.service';

@Module({
  imports: [ConfigModule],
  providers: [FileProcessingService, StorageService],
  exports: [FileProcessingService],
})
export class FileProcessingModule {} 