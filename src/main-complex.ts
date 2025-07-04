import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { AppModule } from './app.module';

const redoc = require('redoc-express');

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  // Create NestJS application
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get('PORT', 3000);
  const nodeEnv = configService.get('NODE_ENV', 'development');

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
      },
    },
  }));

  // Compression middleware
  app.use(compression({
    level: configService.get('COMPRESSION_LEVEL', 6),
    threshold: configService.get('COMPRESSION_THRESHOLD', 1024),
  }));

  // Cookie parser
  app.use(cookieParser());

  // Session configuration
  app.use(
    session({
      secret: configService.get('SESSION_SECRET', 'default-session-secret'),
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: configService.get('MONGODB_URI'),
        ttl: 24 * 60 * 60, // 1 day
      }),
      cookie: {
        maxAge: configService.get('SESSION_MAX_AGE', 86400000), // 24 hours
        httpOnly: true,
        secure: nodeEnv === 'production',
        sameSite: 'lax',
      },
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', 'http://localhost:3000').split(','),
    credentials: configService.get('CORS_CREDENTIALS', true),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-app-id', 'x-api-key'],
  });

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
      '/login',
      '/logout',
    ],
  });

  // Swagger configuration
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Digital Bucket API')
    .setDescription('A comprehensive file storage management system with DigitalOcean Spaces integration')
    .setVersion('1.0.0')
    .setContact(
      'Digital Bucket Team',
      'https://github.com/your-username/digital-bucket',
      'contact@digitalbucket.com'
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer(`http://localhost:${port}`, 'Development server')
    .addServer('https://api.digitalbucket.com', 'Production server')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'API key for application authentication',
      },
      'ApiKeyAuth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-app-id',
        in: 'header',
        description: 'Application ID for request identification',
      },
      'AppIdAuth',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token for admin authentication',
      },
      'JwtAuth',
    )
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('Files', 'File upload, download, and management operations')
    .addTag('Folders', 'Folder creation and management')
    .addTag('Apps', 'Application and API key management')
    .addTag('Admin', 'Administrative operations and dashboard')
    .addTag('Health', 'Health check and monitoring endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  
  // Swagger UI
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Digital Bucket API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showRequestHeaders: true,
      tryItOutEnabled: true,
    },
  });

  // ReDoc
  app.use('/api/redoc', redoc({
    title: 'Digital Bucket API Documentation',
    specUrl: '/api/docs-json',
    nonce: '',
    redocOptions: {
      theme: {
        colors: {
          primary: {
            main: '#3b82f6'
          }
        },
        typography: {
          fontSize: '14px',
          lineHeight: '1.5em',
          code: {
            fontSize: '13px'
          }
        }
      },
      hideDownloadButton: false,
      disableSearch: false,
      menuToggle: true,
      sortPropsAlphabetically: true,
      payloadSampleIdx: 0,
    },
  }));

  // OpenAPI JSON endpoint
  app.use('/api/docs-json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(document);
  });

  // Start the application
  await app.listen(port, '0.0.0.0');
  
  logger.log(`🚀 Digital Bucket API is running on: http://localhost:${port}`);
  logger.log(`📖 Swagger documentation: http://localhost:${port}/api/docs`);
  logger.log(`📚 ReDoc documentation: http://localhost:${port}/api/redoc`);
  logger.log(`🎛️ Admin dashboard: http://localhost:${port}/dashboard`);
  logger.log(`🔍 Environment: ${nodeEnv}`);
  
  if (nodeEnv === 'development') {
    logger.log(`🗄️ MongoDB Express: http://localhost:8081`);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

bootstrap().catch((error) => {
  console.error('Error starting application:', error);
  process.exit(1);
});
