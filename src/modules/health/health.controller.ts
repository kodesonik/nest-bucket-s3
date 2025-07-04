import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Get application health status' })
  @ApiResponse({ 
    status: 200, 
    description: 'Application is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2023-12-01T10:00:00Z' },
        uptime: { type: 'number', example: 12345 },
        version: { type: 'string', example: '1.0.0' },
        environment: { type: 'string', example: 'development' },
      }
    }
  })
  @ApiResponse({ status: 503, description: 'Application is unhealthy' })
  async getHealth() {
    return this.healthService.getHealthStatus();
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Get detailed health status including database and storage' })
  @ApiResponse({ status: 200, description: 'Detailed health information' })
  async getDetailedHealth() {
    return this.healthService.getDetailedHealthStatus();
  }
} 