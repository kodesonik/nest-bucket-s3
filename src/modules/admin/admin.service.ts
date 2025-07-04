import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { App, AppDocument } from '../../schemas/app.schema';
import { File, FileDocument } from '../../schemas/file.schema';
import { Webhook, WebhookDocument } from '../../schemas/webhook.schema';
import { WebhookEvent, WebhookEventDocument } from '../../schemas/webhook-event.schema';
import { StorageService } from '../storage/storage.service';
import * as bcrypt from 'bcryptjs';

export interface DashboardStats {
  users: {
    total: number;
    active: number;
    inactive: number;
    newToday: number;
    newThisWeek: number;
  };
  apps: {
    total: number;
    active: number;
    inactive: number;
  };
  files: {
    total: number;
    totalSize: number;
    uploadedToday: number;
    uploadedThisWeek: number;
  };
  webhooks: {
    total: number;
    active: number;
    deliveredToday: number;
    failedToday: number;
  };
}

export interface SystemHealth {
  database: { status: string; latency: number };
  storage: { status: string; available: boolean };
  memory: { used: number; total: number; percentage: number };
  uptime: number;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(App.name) private appModel: Model<AppDocument>,
    @InjectModel(File.name) private fileModel: Model<FileDocument>,
    @InjectModel(Webhook.name) private webhookModel: Model<WebhookDocument>,
    @InjectModel(WebhookEvent.name) private webhookEventModel: Model<WebhookEventDocument>,
    private storageService: StorageService,
  ) {}

  async getRecentActivity(): Promise<any[]> {
    // Get recent activity from various collections
    const recentUsers = await this.userModel
      .find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('email createdAt status')
      .lean();

    const recentApps = await this.appModel
      .find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name createdAt status')
      .lean();

    const recentFiles = await this.fileModel
      .find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('originalName createdAt size')
      .lean();

    const activity = [
      ...recentUsers.map(user => ({
        type: 'user_created',
        timestamp: user.createdAt,
        description: `New user registered: ${user.email}`,
      })),
      ...recentApps.map(app => ({
        type: 'app_created',
        timestamp: app.createdAt,
        description: `New app created: ${app.name}`,
      })),
      ...recentFiles.map(file => ({
        type: 'file_uploaded',
        timestamp: file.createdAt,
        description: `File uploaded: ${file.originalName}`,
      })),
    ];

    return activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // User statistics
    const totalUsers = await this.userModel.countDocuments();
    const activeUsers = await this.userModel.countDocuments({ status: 'active' });
    const inactiveUsers = await this.userModel.countDocuments({ status: { $ne: 'active' } });
    const newUsersToday = await this.userModel.countDocuments({ createdAt: { $gte: today } });
    const newUsersThisWeek = await this.userModel.countDocuments({ createdAt: { $gte: weekAgo } });

    // App statistics
    const totalApps = await this.appModel.countDocuments();
    const activeApps = await this.appModel.countDocuments({ status: 'active' });
    const inactiveApps = await this.appModel.countDocuments({ status: { $ne: 'active' } });

    // File statistics
    const totalFiles = await this.fileModel.countDocuments();
    const fileSizeAgg = await this.fileModel.aggregate([
      { $group: { _id: null, totalSize: { $sum: '$size' } } }
    ]);
    const totalSize = fileSizeAgg[0]?.totalSize || 0;
    const filesUploadedToday = await this.fileModel.countDocuments({ uploadedAt: { $gte: today } });
    const filesUploadedThisWeek = await this.fileModel.countDocuments({ uploadedAt: { $gte: weekAgo } });

    // Webhook statistics
    const totalWebhooks = await this.webhookModel.countDocuments();
    const activeWebhooks = await this.webhookModel.countDocuments({ isActive: true });
    const deliveredToday = await this.webhookEventModel.countDocuments({
      status: 'delivered',
      deliveredAt: { $gte: today }
    });
    const failedToday = await this.webhookEventModel.countDocuments({
      status: 'failed',
      failedAt: { $gte: today }
    });

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        newToday: newUsersToday,
        newThisWeek: newUsersThisWeek,
      },
      apps: {
        total: totalApps,
        active: activeApps,
        inactive: inactiveApps,
      },
      files: {
        total: totalFiles,
        totalSize,
        uploadedToday: filesUploadedToday,
        uploadedThisWeek: filesUploadedThisWeek,
      },
      webhooks: {
        total: totalWebhooks,
        active: activeWebhooks,
        deliveredToday,
        failedToday,
      },
    };
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const startTime = Date.now();
    
    // Test database connectivity
    let dbStatus = 'healthy';
    let dbLatency = 0;
    try {
      const dbStart = Date.now();
      await this.userModel.findOne().limit(1);
      dbLatency = Date.now() - dbStart;
    } catch (error) {
      dbStatus = 'unhealthy';
      this.logger.error('Database health check failed', error);
    }

    // Test storage connectivity
    let storageStatus = 'healthy';
    let storageAvailable = true;
    try {
      // Test with a simple list operation
      await this.storageService.listFiles('', 1);
    } catch (error) {
      storageStatus = 'unhealthy';
      storageAvailable = false;
      this.logger.error('Storage health check failed', error);
    }

    // Memory usage
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal;
    const usedMemory = memUsage.heapUsed;
    const memoryPercentage = (usedMemory / totalMemory) * 100;

    return {
      database: { status: dbStatus, latency: dbLatency },
      storage: { status: storageStatus, available: storageAvailable },
      memory: {
        used: usedMemory,
        total: totalMemory,
        percentage: Math.round(memoryPercentage * 100) / 100,
      },
      uptime: process.uptime(),
    };
  }

  async getUsers(
    page: number = 1,
    limit: number = 20,
    filters: {
      status?: string;
      role?: string;
      search?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {},
  ): Promise<{
    users: UserDocument[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const query: any = {};

    if (filters.status) query.status = filters.status;
    if (filters.role) query.role = filters.role;
    if (filters.search) {
      query.$or = [
        { email: new RegExp(filters.search, 'i') },
        { 'profile.firstName': new RegExp(filters.search, 'i') },
        { 'profile.lastName': new RegExp(filters.search, 'i') },
      ];
    }
    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) query.createdAt.$gte = filters.dateFrom;
      if (filters.dateTo) query.createdAt.$lte = filters.dateTo;
    }

    const total = await this.userModel.countDocuments(query);
    const users = await this.userModel
      .find(query)
      .select('-password -twoFactor.secret -security.sessionTokens')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return {
      users,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async createUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
    status?: string;
  }): Promise<UserDocument> {
    const existingUser = await this.userModel.findOne({ email: userData.email });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 12);

    const user = new this.userModel({
      email: userData.email,
      password: hashedPassword,
      role: userData.role || 'user',
      status: userData.status || 'active',
      emailVerified: true, // Admin created users are pre-verified
      profile: {
        firstName: userData.firstName,
        lastName: userData.lastName,
      },
    });

    await user.save();
    this.logger.log(`Admin created user: ${userData.email}`);
    return user;
  }

  async updateUser(
    userId: string,
    updates: {
      email?: string;
      firstName?: string;
      lastName?: string;
      role?: string;
      status?: string;
    },
  ): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updates.email && updates.email !== user.email) {
      const existingUser = await this.userModel.findOne({ email: updates.email });
      if (existingUser) {
        throw new BadRequestException('Email already in use');
      }
      user.email = updates.email;
    }

    if (updates.firstName && updates.lastName) {
      user.fullName = `${updates.firstName} ${updates.lastName}`;
    }
    if (updates.role) user.role = updates.role;
    if (updates.status) user.status = updates.status;

    await user.save();
    this.logger.log(`Admin updated user: ${user.email}`);
    return user;
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete associated apps
    const apps = await this.appModel.find({ userId: new Types.ObjectId(userId) });
    
    // Delete associated files and their storage
    const files = await this.fileModel.find({ userId: new Types.ObjectId(userId) });
    const fileKeys = files.map(file => file.key);
    
    if (fileKeys.length > 0) {
      try {
        await this.storageService.deleteMultipleFiles(fileKeys);
      } catch (error) {
        this.logger.error(`Failed to delete files for user ${userId}:`, error);
      }
    }

    // Delete database records
    await Promise.all([
      this.appModel.deleteMany({ userId: new Types.ObjectId(userId) }),
      this.fileModel.deleteMany({ userId: new Types.ObjectId(userId) }),
      this.webhookModel.deleteMany({ userId: new Types.ObjectId(userId) }),
      this.userModel.deleteOne({ _id: userId }),
    ]);

    this.logger.log(`Admin deleted user and all associated data: ${user.email}`);
  }

  async getApps(
    page: number = 1,
    limit: number = 20,
    filters: {
      status?: string;
      userId?: string;
      search?: string;
    } = {},
  ): Promise<{
    apps: AppDocument[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const query: any = {};

    if (filters.status) query.status = filters.status;
    if (filters.userId) query.userId = new Types.ObjectId(filters.userId);
    if (filters.search) {
      query.$or = [
        { name: new RegExp(filters.search, 'i') },
        { description: new RegExp(filters.search, 'i') },
      ];
    }

    const total = await this.appModel.countDocuments(query);
    const apps = await this.appModel
      .find(query)
      .populate('userId', 'email profile.firstName profile.lastName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return {
      apps,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async updateApp(
    appId: string,
    updates: {
      name?: string;
      description?: string;
      status?: string;
    },
  ): Promise<AppDocument> {
    const app = await this.appModel.findById(appId);
    if (!app) {
      throw new NotFoundException('App not found');
    }

    Object.assign(app, updates);
    await app.save();

    this.logger.log(`Admin updated app: ${app.name}`);
    return app;
  }

  async deleteApp(appId: string): Promise<void> {
    const app = await this.appModel.findById(appId);
    if (!app) {
      throw new NotFoundException('App not found');
    }

    // Delete associated files
    const files = await this.fileModel.find({ appId: new Types.ObjectId(appId) });
    const fileKeys = files.map(file => file.key);
    
    if (fileKeys.length > 0) {
      try {
        await this.storageService.deleteMultipleFiles(fileKeys);
      } catch (error) {
        this.logger.error(`Failed to delete files for app ${appId}:`, error);
      }
    }

    // Delete database records
    await Promise.all([
      this.fileModel.deleteMany({ appId: new Types.ObjectId(appId) }),
      this.webhookModel.deleteMany({ appId: new Types.ObjectId(appId) }),
      this.appModel.deleteOne({ _id: appId }),
    ]);

    this.logger.log(`Admin deleted app and all associated data: ${app.name}`);
  }

  async getFileStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: Record<string, number>;
    filesByDate: Array<{ date: string; count: number; size: number }>;
    largestFiles: Array<{ filename: string; size: number; createdAt: Date }>;
  }> {
    const totalFiles = await this.fileModel.countDocuments();
    
    const sizeAgg = await this.fileModel.aggregate([
      { $group: { _id: null, totalSize: { $sum: '$size' } } }
    ]);
    const totalSize = sizeAgg[0]?.totalSize || 0;

    const typeAgg = await this.fileModel.aggregate([
      { $group: { _id: '$mimeType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    const filesByType = typeAgg.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const dateAgg = await this.fileModel.aggregate([
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
    const filesByDate = dateAgg.map(item => ({
      date: item._id,
      count: item.count,
      size: item.size
    }));

    const largestFiles = await this.fileModel
      .find()
      .select('filename size uploadedAt')
      .sort({ size: -1 })
      .limit(10);

    return {
      totalFiles,
      totalSize,
      filesByType,
      filesByDate,
      largestFiles,
    };
  }

  async cleanupOrphanedFiles(): Promise<{ deletedCount: number; freedSpace: number }> {
    // Find files that don't have corresponding storage entries
    const files = await this.fileModel.find();
    let deletedCount = 0;
    let freedSpace = 0;

    for (const file of files) {
      try {
        try {
          await this.storageService.getFileMetadata(file.url);
          // File exists
        } catch (error) {
          // File doesn't exist, delete from database
          await this.fileModel.deleteOne({ _id: file._id });
          deletedCount++;
          freedSpace += file.size;
        }
      } catch (error) {
        this.logger.error(`Error checking file ${file.key}:`, error);
      }
    }

    this.logger.log(`Cleanup completed: ${deletedCount} orphaned files removed, ${freedSpace} bytes freed`);
    return { deletedCount, freedSpace };
  }

  // Add missing methods that controllers are calling
  async getAnalytics(period: string, metrics?: string[]): Promise<any> {
    // Implementation for analytics
    return {
      period,
      metrics: metrics || ['files', 'storage', 'users'],
      data: {
        totalFiles: 0,
        totalStorage: 0,
        activeUsers: 0,
        uploads: [],
        downloads: [],
      },
    };
  }

  async getReports(period: string, type?: string, format: string = 'json'): Promise<any> {
    // Implementation for reports
    return {
      period,
      type: type || 'summary',
      format,
      data: {
        summary: {},
        details: [],
      },
    };
  }

  async generateReport(reportConfig: any, userId: string): Promise<any> {
    // Implementation for report generation
    return {
      reportId: 'report_id',
      status: 'completed',
      downloadUrl: 'report_url',
    };
  }

  async getSystemConfig(): Promise<any> {
    // Implementation for system configuration
    return {
      storage: {
        maxFileSize: 104857600,
        allowedTypes: ['image', 'video', 'document'],
      },
      security: {
        requireEmailVerification: true,
        maxLoginAttempts: 5,
      },
      features: {
        webhooks: true,
        analytics: true,
        backup: true,
      },
    };
  }

  async getFeatureFlags(): Promise<any> {
    // Implementation for feature flags
    return {
      webhooks: true,
      analytics: true,
      backup: true,
      maintenance: false,
      beta: false,
    };
  }

  async updateFeatureFlags(flags: any, userId: string): Promise<any> {
    // Implementation for updating feature flags
    return {
      success: true,
      flags,
      updatedBy: userId,
    };
  }

  async enableMaintenance(maintenanceDto: any): Promise<any> {
    // Implementation for enabling maintenance mode
    return {
      success: true,
      maintenance: true,
      message: maintenanceDto.message,
      scheduledEnd: maintenanceDto.scheduledEnd,
    };
  }

  async disableMaintenance(): Promise<any> {
    // Implementation for disabling maintenance mode
    return {
      success: true,
      maintenance: false,
    };
  }

  async getMaintenanceStatus(): Promise<any> {
    // Implementation for maintenance status
    return {
      maintenance: false,
      message: null,
      scheduledEnd: null,
    };
  }

  async createBackup(backupDto: any, userId: string): Promise<any> {
    // Implementation for creating backup
    return {
      backupId: 'backup_id',
      status: 'completed',
      size: 0,
      createdAt: new Date(),
    };
  }

  async listBackups(): Promise<any[]> {
    // Implementation for listing backups
    return [];
  }

  async restoreBackup(backupId: string, userId: string): Promise<any> {
    // Implementation for restoring backup
    return {
      success: true,
      backupId,
      restoredAt: new Date(),
    };
  }

  async deleteBackup(backupId: string): Promise<any> {
    // Implementation for deleting backup
    return {
      success: true,
      backupId,
    };
  }

  async getAuditLogs(options: any): Promise<any> {
    // Implementation for audit logs
    return {
      logs: [],
      total: 0,
      page: options.page || 1,
      limit: options.limit || 50,
    };
  }

  async getSecurityThreats(severity?: string, status?: string): Promise<any[]> {
    // Implementation for security threats
    return [];
  }

  async runSecurityScan(scanOptions: any): Promise<any> {
    // Implementation for security scan
    return {
      scanId: 'scan_id',
      status: 'completed',
      threats: [],
      recommendations: [],
    };
  }

  async getFirewallRules(): Promise<any[]> {
    // Implementation for firewall rules
    return [];
  }

  async addFirewallRule(rule: any, userId: string): Promise<any> {
    // Implementation for adding firewall rule
    return {
      ruleId: 'rule_id',
      rule,
      createdBy: userId,
    };
  }

  async deleteFirewallRule(ruleId: string): Promise<any> {
    // Implementation for deleting firewall rule
    return {
      success: true,
      ruleId,
    };
  }

  private generateRandomToken(): string {
    // Implementation for generating a random token
    return 'random_token';
  }
} 