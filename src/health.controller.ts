import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Digital Bucket API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }
} 