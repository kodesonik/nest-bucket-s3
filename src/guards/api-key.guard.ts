import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Request } from 'express';
import { App, AppDocument } from '../schemas/app.schema';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(
    @InjectModel(App.name) private appModel: Model<AppDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.extractApiKey(request);
    const appId = this.extractAppId(request);

    if (!apiKey || !appId) {
      throw new UnauthorizedException('API key and App ID are required');
    }

    try {
      const app = await this.validateApiKey(apiKey, appId);
      
      if (!app) {
        throw new UnauthorizedException('Invalid API key or App ID');
      }

      if (app.status !== 'active') {
        throw new UnauthorizedException('Application is not active');
      }

      // Check rate limits
      await this.checkRateLimit(app, request);

      // Attach app to request
      (request as any).app = app;

      // Update last used timestamp
      await this.updateLastUsed(app._id);

      return true;
    } catch (error) {
      this.logger.error(`API key validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new UnauthorizedException('Invalid API credentials');
    }
  }

  private extractApiKey(request: Request): string | undefined {
    // Check headers
    const headerKey = request.headers['x-api-key'] as string;
    if (headerKey) return headerKey;

    // Check query parameter
    const queryKey = request.query['api_key'] as string;
    if (queryKey) return queryKey;

    // Check Authorization header (Bearer token format)
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return undefined;
  }

  private extractAppId(request: Request): string | undefined {
    // Check headers
    const headerAppId = request.headers['x-app-id'] as string;
    if (headerAppId) return headerAppId;

    // Check query parameter
    const queryAppId = request.query['app_id'] as string;
    if (queryAppId) return queryAppId;

    return undefined;
  }

  private async validateApiKey(
    apiKey: string,
    appId: string,
  ): Promise<AppDocument | null> {
    const app = await this.appModel.findOne({
      _id: appId,
      'apiKeys.keyHash': apiKey,
      'apiKeys.isActive': true,
    }).exec();

    return app;
  }

  private async checkRateLimit(
    app: AppDocument,
    request: Request,
  ): Promise<void> {
    // Simple rate limiting check based on actual schema
    const now = new Date();
    
    // Update usage statistics (using existing schema properties)
    await this.appModel.updateOne(
      { _id: app._id },
      {
        $inc: {
          'usage.apiCalls': 1,
        },
        $set: {
          'usage.lastActivity': now,
        },
      },
    ).exec();
  }

  private async updateLastUsed(appId: string): Promise<void> {
    await this.appModel.updateOne(
      { _id: appId },
      {
        $set: {
          'apiKeys.$.lastUsed': new Date(),
        },
      },
    ).exec();
  }
} 