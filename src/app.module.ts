import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { AppsModule } from './modules/apps/apps.module';
import { FilesModule } from './modules/files/files.module';
// StorageModule not needed as individual services are imported by other modules
import { HealthModule } from './modules/health/health.module';
import { WebhookModule } from './modules/webhooks/webhook.module';
import { FileProcessingModule } from './modules/file-processing/file-processing.module';

// Configuration
import databaseConfig from './config/database.config';
import storageConfig from './config/storage.config';
import authConfig from './config/auth.config';
import appConfig from './config/app.config';

@Module({
  imports: [
    // Configuration Module
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        storageConfig,
        authConfig,
      ],
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),

    // Database Module
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
        useNewUrlParser: true,
        useUnifiedTopology: true,
        autoIndex: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        bufferMaxEntries: 0,
      }),
      inject: [ConfigService],
    }),

    // Rate Limiting Module
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get('RATE_LIMIT_TTL', 60000),
            limit: configService.get('RATE_LIMIT_REQUESTS', 100),
          },
        ],
      }),
      inject: [ConfigService],
    }),

    // Static Files Module
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/public/',
      exclude: ['/api*', '/dashboard*'],
    }),

    // Feature Modules
    AuthModule,
    AdminModule,
    AppsModule,
    FilesModule,
    HealthModule,
    WebhookModule,
    FileProcessingModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const nodeEnv = this.configService.get('NODE_ENV', 'development');
    const dbUri = this.configService.get('database.uri');
    
    console.log(`📊 Environment: ${nodeEnv}`);
    console.log(`🗄️ Database: ${dbUri ? 'Connected' : 'Not configured'}`);
    console.log(`☁️ Storage: ${this.configService.get('storage.provider', 'DigitalOcean Spaces')}`);
  }
}
