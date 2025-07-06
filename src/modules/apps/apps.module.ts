import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AppsService } from './apps.service';
import { AppsController } from './apps.controller';
import { App, AppSchema } from '../../schemas/app.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { File, FileSchema } from '../../schemas/file.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: App.name, schema: AppSchema },
      { name: User.name, schema: UserSchema },
      { name: File.name, schema: FileSchema },
    ]),
  ],
  
  controllers: [AppsController],
  
  providers: [AppsService],
  
  exports: [AppsService],
})
export class AppsModule {} 