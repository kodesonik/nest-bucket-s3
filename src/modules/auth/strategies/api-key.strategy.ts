import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { App, AppDocument } from '../../../schemas/app.schema';
import { User, UserDocument } from '../../../schemas/user.schema';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(
    @InjectModel(App.name) private appModel: Model<AppDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    super();
  }

  async validate(request: any): Promise<any> {
    let apiKey: string | undefined;

    // Extract API key from various sources
    if (request.headers['x-api-key']) {
      apiKey = request.headers['x-api-key'];
    } else if (request.headers['authorization']) {
      const authHeader = request.headers['authorization'];
      if (authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7);
      } else if (authHeader.startsWith('ApiKey ')) {
        apiKey = authHeader.substring(7);
      }
    } else if (request.query.api_key) {
      apiKey = request.query.api_key;
    }

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    try {
      // Find app by API key
      const app = await this.appModel.findOne({
        'apiKeys.key': apiKey,
        status: 'active',
      }).populate('userId');

      if (!app) {
        throw new UnauthorizedException('Invalid API key');
      }

      // Find the specific API key within the app
      const foundApiKey = app.apiKeys.find(key => key.key === apiKey && key.isActive);

      if (!foundApiKey) {
        throw new UnauthorizedException('API key is inactive');
      }

      // Check if API key has expired
      if (foundApiKey.expiresAt && foundApiKey.expiresAt < new Date()) {
        throw new UnauthorizedException('API key has expired');
      }

      // Get user details
      const user = await this.userModel.findById(app.userId);

      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('User account is inactive');
      }

      // Update last used timestamp
      foundApiKey.lastUsedAt = new Date();
      foundApiKey.usage.totalRequests = (foundApiKey.usage.totalRequests || 0) + 1;
      foundApiKey.usage.lastRequestAt = new Date();
      foundApiKey.usage.lastRequestIp = request.ip;
      await app.save();

      // Return context for request
      return {
        userId: user._id.toString(),
        appId: app._id.toString(),
        email: user.email,
        role: user.role,
        apiKey: foundApiKey,
        app,
        user,
        authType: 'api-key',
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('API key validation failed');
    }
  }
} 