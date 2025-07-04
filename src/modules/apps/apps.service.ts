import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { App, AppDocument } from '../../schemas/app.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { File, FileDocument } from '../../schemas/file.schema';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export interface CreateAppDto {
  name: string;
  description?: string;
  settings?: {
    maxFileSize?: number;
    allowedFileTypes?: string[];
    webhookUrl?: string;
    rateLimits?: {
      requestsPerMinute?: number;
      uploadSizePerDay?: number;
    };
  };
}

export interface UpdateAppDto {
  name?: string;
  description?: string;
  settings?: {
    maxFileSize?: number;
    allowedFileTypes?: string[];
    webhookUrl?: string;
    rateLimits?: {
      requestsPerMinute?: number;
      uploadSizePerDay?: number;
    };
  };
}

export interface CreateApiKeyDto {
  name: string;
  permissions?: string[];
  expiresAt?: Date;
  rateLimits?: {
    requestsPerMinute?: number;
    requestsPerDay?: number;
  };
}

@Injectable()
export class AppsService {
  private readonly logger = new Logger(AppsService.name);

  constructor(
    @InjectModel(App.name) private appModel: Model<AppDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(File.name) private fileModel: Model<FileDocument>,
  ) {}

  async createApp(userId: string, createAppDto: CreateAppDto): Promise<AppDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check user's app limit based on subscription/plan
    const userApps = await this.appModel.countDocuments({ userId: new Types.ObjectId(userId) });
    const maxApps = this.getMaxAppsForUser(user);
    
    if (userApps >= maxApps) {
      throw new BadRequestException(`Maximum number of apps reached (${maxApps})`);
    }

    // Create default API key
    const defaultApiKey = {
      key: this.generateApiKey(),
      name: 'Default Key',
      permissions: ['file:upload', 'file:download', 'file:list', 'file:delete'],
      isActive: true,
      createdAt: new Date(),
      usage: {
        totalRequests: 0,
        lastRequestAt: null,
        lastRequestIp: null,
      },
    };

    const app = new this.appModel({
      userId: new Types.ObjectId(userId),
      name: createAppDto.name,
      description: createAppDto.description || '',
      apiKeys: [defaultApiKey],
      settings: {
        maxFileSize: createAppDto.settings?.maxFileSize || 10 * 1024 * 1024, // 10MB default
        allowedFileTypes: createAppDto.settings?.allowedFileTypes || [],
        webhookUrl: createAppDto.settings?.webhookUrl || '',
        rateLimits: {
          requestsPerMinute: createAppDto.settings?.rateLimits?.requestsPerMinute || 60,
          uploadSizePerDay: createAppDto.settings?.rateLimits?.uploadSizePerDay || 1024 * 1024 * 1024, // 1GB
        },
      },
      status: 'active',
    });

    await app.save();
    this.logger.log(`App created: ${app.name} for user ${userId}`);
    return app;
  }

  async getApps(userId: string): Promise<AppDocument[]> {
    return this.appModel.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 });
  }

  async getApp(appId: string, userId: string): Promise<AppDocument> {
    const app = await this.appModel.findOne({
      _id: appId,
      userId: new Types.ObjectId(userId),
    });

    if (!app) {
      throw new NotFoundException('App not found');
    }

    return app;
  }

  async updateApp(appId: string, userId: string, updateAppDto: UpdateAppDto): Promise<AppDocument> {
    const app = await this.getApp(appId, userId);

    if (updateAppDto.name) app.name = updateAppDto.name;
    if (updateAppDto.description !== undefined) app.description = updateAppDto.description;
    
    if (updateAppDto.settings) {
      app.settings = {
        ...app.settings,
        ...updateAppDto.settings
      };
    }

    app.updatedAt = new Date();
    await app.save();

    this.logger.log(`App updated: ${app.name}`);
    return app;
  }

  async deleteApp(appId: string, userId: string): Promise<void> {
    const app = await this.getApp(appId, userId);

    // Check if app has files
    const fileCount = await this.fileModel.countDocuments({ appId: new Types.ObjectId(appId) });
    if (fileCount > 0) {
      throw new BadRequestException(`Cannot delete app with ${fileCount} files. Delete files first.`);
    }

    await this.appModel.deleteOne({ _id: appId });
    this.logger.log(`App deleted: ${app.name}`);
  }

  async createApiKey(appId: string, userId: string, createApiKeyDto: CreateApiKeyDto): Promise<{
    keyId: string;
    keyName: string;
    keyHash: string;
    permissions: string[];
    isActive: boolean;
    createdAt: Date;
  }> {
    const app = await this.getApp(appId, userId);

    // Check API key limit
    if (app.apiKeys.length >= 10) {
      throw new BadRequestException('Maximum number of API keys reached (10)');
    }

    const keyId = this.generateApiKey();
    const keyHash = this.generateApiKey();
    
    const apiKey = {
      keyId,
      keyName: createApiKeyDto.name,
      keyHash,
      permissions: createApiKeyDto.permissions || ['read', 'write'],
      isActive: true,
      createdAt: new Date(),
    };

    app.apiKeys.push(apiKey);
    await app.save();

    this.logger.log(`API key created: ${apiKey.keyName} for app ${app.name}`);
    return {
      keyId: apiKey.keyId,
      keyName: apiKey.keyName,
      keyHash: apiKey.keyHash,
      permissions: apiKey.permissions,
      isActive: apiKey.isActive,
      createdAt: apiKey.createdAt,
    };
  }

  async updateApiKey(
    appId: string,
    keyId: string,
    userId: string,
    updates: {
      name?: string;
      permissions?: string[];
      isActive?: boolean;
      expiresAt?: Date;
      rateLimits?: {
        requestsPerMinute?: number;
        requestsPerDay?: number;
      };
    },
  ): Promise<AppDocument> {
    const app = await this.getApp(appId, userId);
    const apiKey = app.apiKeys.find(key => key.keyId === keyId);

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    if (updates.name) apiKey.keyName = updates.name;
    if (updates.permissions) apiKey.permissions = updates.permissions;
    if (updates.isActive !== undefined) apiKey.isActive = updates.isActive;

    await app.save();
    this.logger.log(`API key updated: ${apiKey.keyName} for app ${app.name}`);
    return app;
  }

  async deleteApiKey(appId: string, keyId: string, userId: string): Promise<AppDocument> {
    const app = await this.getApp(appId, userId);

    if (app.apiKeys.length === 1) {
      throw new BadRequestException('Cannot delete the last API key');
    }

    const apiKey = app.apiKeys.find(key => key.keyId === keyId);
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    app.apiKeys = app.apiKeys.filter(key => key.keyId !== keyId);
    await app.save();

    this.logger.log(`API key deleted: ${apiKey.keyName} for app ${app.name}`);
    return app;
  }

  async regenerateApiKey(appId: string, keyId: string, userId: string): Promise<{
    apiKey: any;
    app: AppDocument;
  }> {
    const app = await this.getApp(appId, userId);
    const apiKey = app.apiKeys.find(key => key.keyId === keyId);

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    const oldHash = apiKey.keyHash;
    const newKey = this.generateApiKey();
    apiKey.keyHash = newKey;
    apiKey.lastUsed = null;

    await app.save();
    this.logger.log(`API key regenerated for app ${app.name} (old hash: ${oldHash.substring(0, 8)}...)`);
    return { apiKey, app };
  }

  async getAppStats(appId: string, userId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    apiKeyUsage: Array<{
      keyId: string;
      keyName: string;
      keyHash: string;
      permissions: string[];
      lastUsed: Date | null;
      isActive: boolean;
      createdAt: Date;
    }>;
    filesByType: Record<string, number>;
    uploadsByDate: Array<{
      date: string;
      count: number;
      size: number;
    }>;
  }> {
    const app = await this.getApp(appId, userId);

    const totalFiles = await this.fileModel.countDocuments({ appId: new Types.ObjectId(appId) });
    
    const sizeAgg = await this.fileModel.aggregate([
      { $match: { appId: new Types.ObjectId(appId) } },
      { $group: { _id: null, totalSize: { $sum: '$size' } } }
    ]);
    const totalSize = sizeAgg[0]?.totalSize || 0;

    const apiKeyUsage = app.apiKeys.map(key => ({
      keyId: key.keyId,
      keyName: key.keyName,
      keyHash: key.keyHash.substring(0, 8) + '...',
      permissions: key.permissions,
      lastUsed: key.lastUsed,
      isActive: key.isActive,
      createdAt: key.createdAt
    }));

    const typeAgg = await this.fileModel.aggregate([
      { $match: { appId: new Types.ObjectId(appId) } },
      { $group: { _id: '$mimeType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const filesByType = typeAgg.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const dateAgg = await this.fileModel.aggregate([
      { $match: { appId: new Types.ObjectId(appId) } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$uploadedAt' } },
          count: { $sum: 1 },
          size: { $sum: '$size' }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ]);
    const uploadsByDate = dateAgg.map(item => ({
      date: item._id,
      count: item.count,
      size: item.size
    }));

    return {
      totalFiles,
      totalSize,
      apiKeyUsage,
      filesByType,
      uploadsByDate,
    };
  }

  async validateApiKey(apiKey: string): Promise<{
    app: AppDocument;
    apiKeyObj: any;
    user: UserDocument;
  } | null> {
    const app = await this.appModel.findOne({
      'apiKeys.keyHash': apiKey,
      status: 'active',
    });

    if (!app) {
      return null;
    }

    const apiKeyObj = app.apiKeys.find(key => key.keyHash === apiKey && key.isActive);
    if (!apiKeyObj || !apiKeyObj.isActive) {
      return null;
    }

    const user = await this.userModel.findById(app.createdBy);
    if (!user || user.status !== 'active') {
      return null;
    }

    return { app, apiKeyObj, user };
  }

  private generateApiKey(): string {
    const prefix = 'db_';
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return prefix + randomBytes;
  }

  private getMaxAppsForUser(user: UserDocument): number {
    // This could be based on subscription plan
    switch (user.subscription?.plan) {
      case 'pro':
        return 10;
      case 'enterprise':
        return 50;
      default:
        return 3; // free plan
    }
  }
} 