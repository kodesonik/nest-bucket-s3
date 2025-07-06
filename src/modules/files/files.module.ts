import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { HttpModule } from '@nestjs/axios';

import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { FileProcessingService } from '../file-processing/file-processing.service';
import { StorageService } from '../storage/storage.service';
import { WebhookService } from '../webhooks/webhook.service';

import { File, FileSchema } from '../../schemas/file.schema';
import { Folder, FolderSchema } from '../../schemas/folder.schema';
import { App, AppSchema } from '../../schemas/app.schema';
import { Webhook, WebhookSchema } from '../../schemas/webhook.schema';
import { WebhookEvent, WebhookEventSchema } from '../../schemas/webhook-event.schema';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    MongooseModule.forFeature([
      { name: File.name, schema: FileSchema },
      { name: Folder.name, schema: FolderSchema },
      { name: App.name, schema: AppSchema },
      { name: Webhook.name, schema: WebhookSchema },
      { name: WebhookEvent.name, schema: WebhookEventSchema },
    ]),
    
    MulterModule.registerAsync({
      useFactory: () => ({
        limits: {
          fileSize: 100 * 1024 * 1024, // 100MB
          files: 10,
        },
        fileFilter: (req, file, callback) => {
          // File type validation will be handled in the service
          callback(null, true);
        },
      }),
    }),
  ],
  
  controllers: [FilesController],
  
  providers: [
    FilesService,
    FileProcessingService,
    StorageService,
    WebhookService,
  ],
  
  exports: [FilesService],
})
export class FilesModule {} 