import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';

export interface CreateWebhookDto {
  appId: string;
  url: string;
  events: string[];
  secret?: string;
  isActive?: boolean;
  settings?: {
    retryPolicy?: {
      maxAttempts?: number;
      retryDelay?: number;
      backoffMultiplier?: number;
    };
    timeout?: number;
    rateLimiting?: {
      requestsPerMinute?: number;
    };
    filters?: {
      fileTypes?: string[];
      minFileSize?: number;
      maxFileSize?: number;
      pathPattern?: string;
    };
  };
}

export interface UpdateWebhookDto {
  url?: string;
  events?: string[];
  secret?: string;
  isActive?: boolean;
  settings?: {
    retryPolicy?: {
      maxAttempts?: number;
      retryDelay?: number;
      backoffMultiplier?: number;
    };
    timeout?: number;
    rateLimiting?: {
      requestsPerMinute?: number;
    };
    filters?: {
      fileTypes?: string[];
      minFileSize?: number;
      maxFileSize?: number;
      pathPattern?: string;
    };
  };
}

@ApiTags('Webhooks')
@Controller('webhooks')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class WebhookController {
  constructor(private webhookService: WebhookService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new webhook' })
  @ApiResponse({ status: 201, description: 'Webhook created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createWebhook(@Request() req: any, @Body(ValidationPipe) createWebhookDto: CreateWebhookDto) {
    try {
      const webhook = await this.webhookService.createWebhook(req.user.userId, createWebhookDto);
      return {
        success: true,
        message: 'Webhook created successfully',
        data: {
          id: webhook._id,
          appId: webhook.appId,
          url: webhook.url,
          events: webhook.events,
          isActive: webhook.isActive,
          settings: webhook.settings,
          createdAt: webhook.createdAt,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all webhooks for user' })
  @ApiResponse({ status: 200, description: 'Webhooks retrieved successfully' })
  @ApiQuery({ name: 'appId', required: false, description: 'Filter by app ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (active/inactive)' })
  async getWebhooks(
    @Request() req: any,
    @Query('appId') appId?: string,
    @Query('status') status?: string,
  ) {
    const filters = { appId, status: status === 'active' ? true : status === 'inactive' ? false : undefined };
    const webhooks = await this.webhookService.getWebhooks(req.user.userId, filters);
    
    return {
      success: true,
      data: webhooks.map(webhook => ({
        id: webhook._id,
        appId: webhook.appId,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        statistics: webhook.statistics,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt,
      })),
    };
  }

  @Get(':webhookId')
  @ApiOperation({ summary: 'Get webhook details' })
  @ApiResponse({ status: 200, description: 'Webhook retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async getWebhook(@Request() req: any, @Param('webhookId') webhookId: string) {
    const webhook = await this.webhookService.getWebhook(webhookId, req.user.userId);
    return {
      success: true,
      data: {
        id: webhook._id,
        appId: webhook.appId,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        settings: webhook.settings,
        statistics: webhook.statistics,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt,
      },
    };
  }

  @Put(':webhookId')
  @ApiOperation({ summary: 'Update webhook' })
  @ApiResponse({ status: 200, description: 'Webhook updated successfully' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async updateWebhook(
    @Request() req: any,
    @Param('webhookId') webhookId: string,
    @Body(ValidationPipe) updateWebhookDto: UpdateWebhookDto,
  ) {
    const webhook = await this.webhookService.updateWebhook(webhookId, req.user.userId, updateWebhookDto);
    return {
      success: true,
      message: 'Webhook updated successfully',
      data: {
        id: webhook._id,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        settings: webhook.settings,
        updatedAt: webhook.updatedAt,
      },
    };
  }

  @Delete(':webhookId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete webhook' })
  @ApiResponse({ status: 204, description: 'Webhook deleted successfully' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async deleteWebhook(@Request() req: any, @Param('webhookId') webhookId: string) {
    await this.webhookService.deleteWebhook(webhookId, req.user.userId);
  }

  @Post(':webhookId/test')
  @ApiOperation({ summary: 'Test webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook test completed' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async testWebhook(
    @Request() req: any,
    @Param('webhookId') webhookId: string,
    @Body() testPayload?: any,
  ) {
    const result = await this.webhookService.testWebhook(webhookId, req.user.userId, testPayload);
    return {
      success: true,
      message: 'Webhook test completed',
      data: result,
    };
  }

  @Get(':webhookId/events')
  @ApiOperation({ summary: 'Get webhook delivery events' })
  @ApiResponse({ status: 200, description: 'Events retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  async getWebhookEvents(
    @Request() req: any,
    @Param('webhookId') webhookId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const filters = {
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    };
    
    const result = await this.webhookService.getWebhookEvents(webhookId, req.user.userId, filters);
    return {
      success: true,
      data: result,
    };
  }

  @Post(':webhookId/events/:eventId/retry')
  @ApiOperation({ summary: 'Retry failed webhook event' })
  @ApiResponse({ status: 200, description: 'Event retry initiated' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async retryWebhookEvent(
    @Request() req: any,
    @Param('webhookId') webhookId: string,
    @Param('eventId') eventId: string,
  ) {
    const result = await this.webhookService.retryWebhookEvent(eventId, req.user.userId);
    return {
      success: true,
      message: 'Event retry initiated',
      data: result,
    };
  }

  @Get(':webhookId/stats')
  @ApiOperation({ summary: 'Get webhook statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days for statistics' })
  async getWebhookStats(
    @Request() req: any,
    @Param('webhookId') webhookId: string,
    @Query('days') days?: string,
  ) {
    const daysPeriod = days ? parseInt(days) : 7;
    const stats = await this.webhookService.getWebhookStats(webhookId, req.user.userId, daysPeriod);
    return {
      success: true,
      data: stats,
    };
  }

  @Post(':webhookId/toggle')
  @ApiOperation({ summary: 'Toggle webhook active status' })
  @ApiResponse({ status: 200, description: 'Webhook status toggled' })
  async toggleWebhook(@Request() req: any, @Param('webhookId') webhookId: string) {
    const webhook = await this.webhookService.toggleWebhook(webhookId, req.user.userId);
    return {
      success: true,
      message: `Webhook ${webhook.isActive ? 'activated' : 'deactivated'}`,
      data: {
        id: webhook._id,
        isActive: webhook.isActive,
      },
    };
  }

  @Get('events/types')
  @ApiOperation({ summary: 'Get available webhook event types' })
  @ApiResponse({ status: 200, description: 'Event types retrieved successfully' })
  async getEventTypes() {
    const eventTypes = this.webhookService.getAvailableEventTypes();
    return {
      success: true,
      data: eventTypes,
    };
  }
} 