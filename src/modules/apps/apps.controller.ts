import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ValidationPipe,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AppsService, CreateAppDto, UpdateAppDto, CreateApiKeyDto } from './apps.service';

@ApiTags('Apps')
@Controller('apps')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class AppsController {
  constructor(private appsService: AppsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new app' })
  @ApiResponse({ status: 201, description: 'App created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createApp(@Request() req: any, @Body(ValidationPipe) createAppDto: CreateAppDto) {
    try {
      const app = await this.appsService.createApp(req.user.userId, createAppDto);
      return {
        success: true,
        message: 'App created successfully',
        data: {
          id: app._id,
          name: app.name,
          description: app.description,
          status: app.status,
          apiKeys: app.apiKeys.map(key => ({
            id: key.keyId,
            name: key.keyName,
            keyHash: key.keyHash.substring(0, 8) + '...',
            permissions: key.permissions,
            isActive: key.isActive,
            createdAt: key.createdAt,
            lastUsed: key.lastUsed,
          })),
          settings: app.settings,
          createdAt: app.createdAt,
        },
      };
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all user apps' })
  @ApiResponse({ status: 200, description: 'Apps retrieved successfully' })
  async getApps(@Request() req: any) {
    const apps = await this.appsService.getApps(req.user.userId);
    return {
      success: true,
      data: apps.map(app => ({
        id: app._id,
        name: app.name,
        description: app.description,
        status: app.status,
        apiKeysCount: app.apiKeys.length,
        settings: app.settings,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
      })),
    };
  }

  @Get(':appId')
  @ApiOperation({ summary: 'Get app details' })
  @ApiResponse({ status: 200, description: 'App retrieved successfully' })
  @ApiResponse({ status: 404, description: 'App not found' })
  async getApp(@Request() req: any, @Param('appId') appId: string) {
    const app = await this.appsService.getApp(appId, req.user.userId);
    const apiKeys = app.apiKeys.map(key => ({
      id: key.keyId,
      name: key.keyName,
      keyHash: key.keyHash.substring(0, 8) + '...',
      permissions: key.permissions,
      isActive: key.isActive,
      createdAt: key.createdAt,
      lastUsed: key.lastUsed,
    }));
    return {
      success: true,
      data: {
        id: app._id,
        name: app.name,
        description: app.description,
        status: app.status,
        apiKeys,
        settings: app.settings,
        usage: app.usage,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
      },
    };
  }

  @Put(':appId')
  @ApiOperation({ summary: 'Update app' })
  @ApiResponse({ status: 200, description: 'App updated successfully' })
  @ApiResponse({ status: 404, description: 'App not found' })
  async updateApp(
    @Request() req: any,
    @Param('appId') appId: string,
    @Body(ValidationPipe) updateAppDto: UpdateAppDto,
  ) {
    const app = await this.appsService.updateApp(appId, req.user.userId, updateAppDto);
    return {
      success: true,
      message: 'App updated successfully',
      data: {
        id: app._id,
        name: app.name,
        description: app.description,
        settings: app.settings,
        updatedAt: app.updatedAt,
      },
    };
  }

  @Delete(':appId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete app' })
  @ApiResponse({ status: 204, description: 'App deleted successfully' })
  @ApiResponse({ status: 404, description: 'App not found' })
  async deleteApp(@Request() req: any, @Param('appId') appId: string) {
    await this.appsService.deleteApp(appId, req.user.userId);
  }

  @Post(':appId/api-keys')
  @ApiOperation({ summary: 'Create new API key' })
  @ApiResponse({ status: 201, description: 'API key created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createApiKey(
    @Request() req: any,
    @Param('appId') appId: string,
    @Body(ValidationPipe) createApiKeyDto: CreateApiKeyDto,
  ) {
    const result = await this.appsService.createApiKey(appId, req.user.userId, createApiKeyDto);
    return {
      success: true,
      message: 'API key created successfully',
      data: {
        id: result.keyId,
        name: result.keyName,
        keyHash: result.keyHash.substring(0, 8) + '...',
        permissions: result.permissions,
        isActive: result.isActive,
        createdAt: result.createdAt,
      },
    };
  }

  @Put(':appId/api-keys/:keyId')
  @ApiOperation({ summary: 'Update API key' })
  @ApiResponse({ status: 200, description: 'API key updated successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async updateApiKey(
    @Request() req: any,
    @Param('appId') appId: string,
    @Param('keyId') keyId: string,
    @Body() updates: {
      name?: string;
      permissions?: string[];
      isActive?: boolean;
      expiresAt?: Date;
      rateLimits?: {
        requestsPerMinute?: number;
        requestsPerDay?: number;
      };
    },
  ) {
    const app = await this.appsService.updateApiKey(appId, keyId, req.user.userId, updates);
    const apiKey = app.apiKeys.find(key => key.keyId === keyId);
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return {
      id: apiKey.keyId,
      name: apiKey.keyName,
      keyHash: apiKey.keyHash.substring(0, 8) + '...',
      permissions: apiKey.permissions,
      isActive: apiKey.isActive,
      createdAt: apiKey.createdAt,
      lastUsed: apiKey.lastUsed,
    };
  }

  @Delete(':appId/api-keys/:keyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete API key' })
  @ApiResponse({ status: 204, description: 'API key deleted successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async deleteApiKey(
    @Request() req: any,
    @Param('appId') appId: string,
    @Param('keyId') keyId: string,
  ) {
    await this.appsService.deleteApiKey(appId, keyId, req.user.userId);
  }

  @Post(':appId/api-keys/:keyId/regenerate')
  @ApiOperation({ summary: 'Regenerate API key' })
  @ApiResponse({ status: 200, description: 'API key regenerated successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async regenerateApiKey(
    @Request() req: any,
    @Param('appId') appId: string,
    @Param('keyId') keyId: string,
  ) {
    const result = await this.appsService.regenerateApiKey(appId, keyId, req.user.userId);
    return {
      success: true,
      message: 'API key regenerated successfully',
      data: {
        id: result.apiKey.keyId,
        name: result.apiKey.keyName,
        keyHash: result.apiKey.keyHash.substring(0, 8) + '...',
        permissions: result.apiKey.permissions,
        isActive: result.apiKey.isActive,
        createdAt: result.apiKey.createdAt,
      },
    };
  }

  @Get(':appId/stats')
  @ApiOperation({ summary: 'Get app statistics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getAppStats(@Request() req: any, @Param('appId') appId: string) {
    const stats = await this.appsService.getAppStats(appId, req.user.userId);
    return {
      success: true,
      data: stats,
    };
  }

  @Get(':appId/api-keys')
  @ApiOperation({ summary: 'Get all API keys for app' })
  @ApiResponse({ status: 200, description: 'API keys retrieved successfully' })
  async getApiKeys(@Request() req: any, @Param('appId') appId: string) {
    const app = await this.appsService.getApp(appId, req.user.userId);
    const apiKeys = app.apiKeys.map(key => ({
      id: key.keyId,
      name: key.keyName,
      keyHash: key.keyHash.substring(0, 8) + '...',
      permissions: key.permissions,
      isActive: key.isActive,
      createdAt: key.createdAt,
      lastUsed: key.lastUsed,
    }));
    return {
      success: true,
      data: apiKeys,
    };
  }
} 