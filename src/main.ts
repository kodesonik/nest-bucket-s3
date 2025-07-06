// Polyfill crypto for global access
import * as crypto from 'crypto';
(global as any).crypto = crypto;

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  // Create NestJS application
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get('PORT', 3000);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-app-id', 'x-api-key'],
  });

  // Static assets
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/public/',
  });

  // EJS template engine
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('ejs');

  // Global prefix for API routes
  app.setGlobalPrefix('api', {
    exclude: [
      '/',
      '/health',
      '/dashboard',
      '/dashboard/(.*)',
    ],
  });

  // Swagger configuration
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Digital Bucket API')
    .setDescription('A comprehensive file storage management system')
    .setVersion('1.0.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
      },
      'ApiKeyAuth',
    )
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap().catch((error) => {
  console.error('Application failed to start:', error);
  process.exit(1);
}); 