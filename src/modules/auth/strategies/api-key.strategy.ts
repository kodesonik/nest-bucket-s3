import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { App, AppDocument } from '../../../schemas/app.schema';
import { User, UserDocument } from '../../../schemas/user.schema';
import { Request } from 'express';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(
    @InjectModel(App.name) private appModel: Model<AppDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    super();
  }

  async validate(apiKey: string, req: Request): Promise<any> {
    const app = await this.appModel.findOne({
      'apiKeys.keyHash': apiKey,
      status: 'active',
    });

    if (!app) {
      throw new UnauthorizedException('Invalid API key');
    }

    const foundApiKey = app.apiKeys.find(key => key.keyHash === apiKey && key.isActive);
    if (!foundApiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    const user = await this.userModel.findById(app.createdBy);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User account is inactive');
    }

    // Update last used timestamp
    foundApiKey.lastUsed = new Date();
    await app.save();

    return {
      app,
      apiKey: foundApiKey,
      user,
      permissions: foundApiKey.permissions,
    };
  }
} 