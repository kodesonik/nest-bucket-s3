import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthService {
  constructor(private configService: ConfigService) {}

  async getHealthStatus() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: this.configService.get('NODE_ENV', 'development'),
    };
  }

  async getDetailedHealthStatus() {
    const basicHealth = await this.getHealthStatus();
    
    return {
      ...basicHealth,
      memory: {
        used: process.memoryUsage(),
        free: require('os').freemem(),
        total: require('os').totalmem(),
      },
      cpu: {
        load: require('os').loadavg(),
        cores: require('os').cpus().length,
      },
      database: {
        status: 'connected', // This would be checked with actual DB connection
      },
      storage: {
        status: 'connected', // This would be checked with actual storage connection
      },
    };
  }
} 