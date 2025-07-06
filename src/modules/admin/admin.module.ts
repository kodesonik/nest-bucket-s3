import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UsersService } from '../users/users.service';
import { AppsModule } from '../apps/apps.module';
import { FilesModule } from '../files/files.module';
import { WebhookModule } from '../webhooks/webhook.module';
import { User, UserSchema } from '../../schemas/user.schema';
import { App, AppSchema } from '../../schemas/app.schema';
import { File, FileSchema } from '../../schemas/file.schema';
import { Webhook, WebhookSchema } from '../../schemas/webhook.schema';
import { WebhookEvent, WebhookEventSchema } from '../../schemas/webhook-event.schema';
import { StorageService } from '../storage/storage.service';

@Module({
  imports: [
    ConfigModule,
    AppsModule,
    FilesModule,
    WebhookModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: App.name, schema: AppSchema },
      { name: File.name, schema: FileSchema },
      { name: Webhook.name, schema: WebhookSchema },
      { name: WebhookEvent.name, schema: WebhookEventSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService, UsersService, StorageService],
  exports: [AdminService],
})
export class AdminModule {} 