import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { Webhook, WebhookSchema } from '../../schemas/webhook.schema';
import { WebhookEvent, WebhookEventSchema } from '../../schemas/webhook-event.schema';
import { App, AppSchema } from '../../schemas/app.schema';
import { User, UserSchema } from '../../schemas/user.schema';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: Webhook.name, schema: WebhookSchema },
      { name: WebhookEvent.name, schema: WebhookEventSchema },
      { name: App.name, schema: AppSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {} 