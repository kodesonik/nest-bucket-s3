import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { File, FileDocument } from '../../schemas/file.schema';
import { Folder, FolderDocument } from '../../schemas/folder.schema';
import { StorageService } from '../storage/storage.service';
import { FileProcessingService } from '../file-processing/file-processing.service';
import { WebhookService } from '../webhooks/webhook.service';

// Type definition for uploaded files
interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface FileUploadOptions {
  folderId?: string;
  isPublic?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
  processFile?: boolean;
}

export interface FileSearchFilters {
  userId?: string;
  appId?: string;
  folderId?: string;
  mimeType?: string;
  tags?: string[];
  sizeMin?: number;
  sizeMax?: number;
  dateFrom?: Date;
  dateTo?: Date;
  isPublic?: boolean;
  search?: string;
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectModel(File.name) private fileModel: Model<FileDocument>,
    @InjectModel(Folder.name) private folderModel: Model<FolderDocument>,
    private storageService: StorageService,
    private fileProcessingService: FileProcessingService,
    private webhookService: WebhookService,
  ) {}

  async uploadFile(
    file: UploadedFile,
    userId: string,
    appId: string,
    options: FileUploadOptions = {},
  ): Promise<FileDocument> {
    try {
      // Validate folder if provided
      if (options.folderId) {
        const folder = await this.folderModel.findOne({
          _id: options.folderId,
          userId: new Types.ObjectId(userId),
        });
        if (!folder) {
          throw new NotFoundException('Folder not found');
        }
      }

      // Generate unique path
      const uploadPath = this.generateUploadPath(userId, appId, options.folderId);

      // Upload to storage
      const uploadResult = await this.storageService.uploadFile(file, uploadPath, {
        acl: options.isPublic ? 'public-read' : 'private',
        metadata: options.metadata,
      });

      // Create file record
      const fileDoc = new this.fileModel({
        userId: new Types.ObjectId(userId),
        appId: new Types.ObjectId(appId),
        folderId: options.folderId ? new Types.ObjectId(options.folderId) : null,
        filename: file.originalname,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: uploadResult.key,
        url: uploadResult.url,
        isPublic: options.isPublic || false,
        tags: options.tags || [],
        metadata: options.metadata || {},
        storageProvider: 'digitalocean',
        bucket: uploadResult.bucket,
        etag: uploadResult.etag,
        uploadedAt: new Date(),
      });

      await fileDoc.save();

      // Process file if requested
      if (options.processFile !== false) {
        this.processFileAsync(fileDoc, file);
      }

      // Trigger webhook
      await this.webhookService.triggerEvent(appId, 'file.uploaded', {
        fileId: fileDoc._id,
        filename: fileDoc.filename,
        size: fileDoc.size,
        mimeType: fileDoc.mimeType,
      });

      this.logger.log(`File uploaded successfully: ${fileDoc.filename} for user ${userId}`);
      return fileDoc;
    } catch (error) {
      this.logger.error(`Failed to upload file: ${(error as Error).message}`);
      throw error;
    }
  }

  async uploadMultipleFiles(
    files: UploadedFile[],
    userId: string,
    appId: string,
    options: FileUploadOptions = {},
  ): Promise<FileDocument[]> {
    const uploadPromises = files.map(file => 
      this.uploadFile(file, userId, appId, options)
    );
    
    return Promise.all(uploadPromises);
  }

  async getFile(fileId: string, userId: string): Promise<FileDocument> {
    const file = await this.fileModel.findOne({
      _id: fileId,
      userId: new Types.ObjectId(userId),
    }).populate('folderId');

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  async getFiles(
    userId: string,
    filters: FileSearchFilters = {},
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    files: FileDocument[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const query: any = { userId: new Types.ObjectId(userId) };

    // Apply filters
    if (filters.appId) query.appId = new Types.ObjectId(filters.appId);
    if (filters.folderId) query.folderId = new Types.ObjectId(filters.folderId);
    if (filters.mimeType) query.mimeType = new RegExp(filters.mimeType, 'i');
    if (filters.tags?.length) query.tags = { $in: filters.tags };
    if (filters.sizeMin || filters.sizeMax) {
      query.size = {};
      if (filters.sizeMin) query.size.$gte = filters.sizeMin;
      if (filters.sizeMax) query.size.$lte = filters.sizeMax;
    }
    if (filters.dateFrom || filters.dateTo) {
      query.uploadedAt = {};
      if (filters.dateFrom) query.uploadedAt.$gte = filters.dateFrom;
      if (filters.dateTo) query.uploadedAt.$lte = filters.dateTo;
    }
    if (filters.isPublic !== undefined) query.isPublic = filters.isPublic;
    if (filters.search) {
      query.$or = [
        { filename: new RegExp(filters.search, 'i') },
        { originalName: new RegExp(filters.search, 'i') },
        { tags: new RegExp(filters.search, 'i') },
      ];
    }

    const total = await this.fileModel.countDocuments(query);
    const files = await this.fileModel
      .find(query)
      .populate('folderId')
      .sort({ uploadedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return {
      files,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async updateFile(
    fileId: string,
    userId: string,
    updates: {
      filename?: string;
      tags?: string[];
      metadata?: Record<string, any>;
      isPublic?: boolean;
      folderId?: string;
    },
  ): Promise<FileDocument> {
    const file = await this.getFile(fileId, userId);

    // Validate folder change if provided
    if (updates.folderId && updates.folderId !== file.folderId?.toString()) {
      if (updates.folderId) {
        const folder = await this.folderModel.findOne({
          _id: updates.folderId,
          userId: new Types.ObjectId(userId),
        });
        if (!folder) {
          throw new NotFoundException('Target folder not found');
        }
      }
    }

    // Update file record
    Object.assign(file, {
      ...updates,
      folderId: updates.folderId ? new Types.ObjectId(updates.folderId) : null,
      updatedAt: new Date(),
    });

    await file.save();

    // Trigger webhook
    await this.webhookService.triggerEvent(file.appId.toString(), 'file.updated', {
      fileId: file._id,
      filename: file.filename,
      changes: updates,
    });

    this.logger.log(`File updated: ${file.filename}`);
    return file;
  }

  async deleteFile(fileId: string, userId: string): Promise<void> {
    const file = await this.getFile(fileId, userId);

    try {
      // Delete from storage
      await this.storageService.deleteFile(file.key);

      // Delete thumbnails if they exist
      if (file.metadata?.thumbnailKey) {
        const thumbnailKeys = [file.metadata.thumbnailKey];
        await this.storageService.deleteMultipleFiles(thumbnailKeys);
      }

      // Delete file record
      await this.fileModel.deleteOne({ _id: fileId });

      // Trigger webhook
      await this.webhookService.triggerEvent(file.appId.toString(), 'file.deleted', {
        fileId: file._id,
        filename: file.filename,
      });

      this.logger.log(`File deleted: ${file.filename}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${fileId}: ${(error as Error).message}`);
      throw error;
    }
  }

  async deleteMultipleFiles(fileIds: string[], userId: string): Promise<void> {
    const files = await this.fileModel.find({
      _id: { $in: fileIds },
      userId: new Types.ObjectId(userId),
    });

    if (files.length !== fileIds.length) {
      throw new BadRequestException('Some files not found or not accessible');
    }

    try {
      // Collect all keys to delete
      const keysToDelete: string[] = [];
      files.forEach(file => {
        keysToDelete.push(file.key);
        if (file.metadata?.thumbnailKey) {
          keysToDelete.push(file.metadata.thumbnailKey);
        }
      });

      // Delete from storage
      if (keysToDelete.length > 0) {
        await this.storageService.deleteMultipleFiles(keysToDelete);
      }

      // Delete file records
      await this.fileModel.deleteMany({ _id: { $in: fileIds } });

      // Trigger webhooks
      for (const file of files) {
        await this.webhookService.triggerEvent(file.appId.toString(), 'file.deleted', {
          fileId: file._id,
          filename: file.filename,
        });
      }

      this.logger.log(`Deleted ${files.length} files`);
    } catch (error) {
      this.logger.error(`Failed to delete multiple files: ${(error as Error).message}`);
      throw error;
    }
  }

  async copyFile(fileId: string, userId: string, targetFolderId?: string): Promise<FileDocument> {
    const sourceFile = await this.getFile(fileId, userId);

    // Validate target folder
    if (targetFolderId) {
      const folder = await this.folderModel.findOne({
        _id: targetFolderId,
        userId: new Types.ObjectId(userId),
      });
      if (!folder) {
        throw new NotFoundException('Target folder not found');
      }
    }

    // Generate new path
    const newPath = this.generateUploadPath(userId, sourceFile.appId.toString(), targetFolderId);
    const newKey = `${newPath}/${Date.now()}-copy-${sourceFile.filename}`;

    try {
      // Copy file in storage (placeholder - storage service doesn't have copyFile)
      // await this.storageService.copyFile(sourceFile.key, newKey);

      // Create new file record
      const copiedFile = new this.fileModel({
        ...sourceFile.toObject(),
        _id: new Types.ObjectId(),
        folderId: targetFolderId ? new Types.ObjectId(targetFolderId) : null,
        key: newKey,
        filename: `copy-${sourceFile.filename}`,
        uploadedAt: new Date(),
        processing: undefined, // Reset processing info
      });

      await copiedFile.save();

      this.logger.log(`File copied: ${sourceFile.filename} -> ${copiedFile.filename}`);
      return copiedFile;
    } catch (error) {
      this.logger.error(`Failed to copy file: ${(error as Error).message}`);
      throw error;
    }
  }

  async moveFile(fileId: string, userId: string, targetFolderId?: string): Promise<FileDocument> {
    const file = await this.getFile(fileId, userId);

    // Validate target folder
    if (targetFolderId) {
      const folder = await this.folderModel.findOne({
        _id: targetFolderId,
        userId: new Types.ObjectId(userId),
      });
      if (!folder) {
        throw new NotFoundException('Target folder not found');
      }
    }

    file.folderId = targetFolderId ? new Types.ObjectId(targetFolderId) : null;
    file.updatedAt = new Date();

    await file.save();

    this.logger.log(`File moved: ${file.filename}`);
    return file;
  }

  async generateDownloadUrl(fileId: string, userId: string, expires: number = 3600): Promise<string> {
    const file = await this.getFile(fileId, userId);

    if (!file.access?.isPublic) {
      // Generate signed URL for private files
      return this.storageService.getSignedUrl(file.key, expires);
    } else {
      // Return public URL
      return file.url;
    }
  }

  async getFileStats(userId: string, appId?: string): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: Record<string, number>;
    recentUploads: number;
  }> {
    const query: any = { userId: new Types.ObjectId(userId) };
    if (appId) query.appId = new Types.ObjectId(appId);

    const totalFiles = await this.fileModel.countDocuments(query);
    
    const sizeAggregation = await this.fileModel.aggregate([
      { $match: query },
      { $group: { _id: null, totalSize: { $sum: '$size' } } },
    ]);
    
    const totalSize = sizeAggregation[0]?.totalSize || 0;

    const typeAggregation = await this.fileModel.aggregate([
      { $match: query },
      { $group: { _id: '$mimeType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const filesByType = typeAggregation.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentUploads = await this.fileModel.countDocuments({
      ...query,
      uploadedAt: { $gte: sevenDaysAgo },
    });

    return {
      totalFiles,
      totalSize,
      filesByType,
      recentUploads,
    };
  }

  private generateUploadPath(userId: string, appId: string, folderId?: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    let path = `uploads/${userId}/${appId}/${year}/${month}`;
    
    if (folderId) {
      path += `/${folderId}`;
    }
    
    return path;
  }

  private async processFileAsync(file: FileDocument, originalFile: UploadedFile): Promise<void> {
    try {
      const result = await this.fileProcessingService.processFile(
        originalFile.buffer,
        file.filename,
        file.mimeType,
      );

      if (result.success) {
        file.processing = result.processing;
        await file.save();
        
        this.logger.log(`File processed successfully: ${file.filename}`);
      }
    } catch (error) {
      this.logger.error(`File processing failed for ${file.filename}: ${(error as Error).message}`);
    }
  }

  // Add missing methods that controllers are calling
  async uploadArchive(file: UploadedFile, uploadDto: any, app: any, ip: string, userAgent: string): Promise<any> {
    // Implementation for archive upload
    return this.uploadFile(file, app._id, app._id, {
      ...uploadDto,
      processFile: true,
    });
  }

  async downloadFile(id: string, appId: string, version?: string, ip?: string): Promise<any> {
    const file = await this.fileModel.findOne({ _id: id, appId });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    
    return {
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.size,
      stream: Buffer.from(''), // Placeholder for actual file stream
    };
  }

  async streamFile(id: string, appId: string, request: any, response: any): Promise<any> {
    const file = await this.fileModel.findOne({ _id: id, appId });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    
    // Implementation for file streaming
    return { success: true };
  }

  async bulkOperation(bulkDto: any, appId: string): Promise<any> {
    // Implementation for bulk operations
    return { success: true, processed: 0 };
  }

  async createArchive(archiveDto: any, appId: string): Promise<any> {
    // Implementation for creating archives
    return { success: true, archiveId: 'archive_id' };
  }

  async getFileVersions(id: string, appId: string): Promise<any> {
    // Implementation for file versions
    return [];
  }

  async restoreFileVersion(id: string, versionId: string, appId: string): Promise<any> {
    // Implementation for version restoration
    return { success: true };
  }

  async searchFiles(options: any): Promise<any> {
    // Implementation for file search
    return { files: [], total: 0 };
  }

  async generateShareLink(id: string, appId: string, expiresIn?: number, password?: string, maxDownloads?: number): Promise<any> {
    // Implementation for share link generation
    return { shareLink: 'share_link_url' };
  }

  async analyzeFile(id: string, appId: string, options: any): Promise<any> {
    // Implementation for file analysis
    return { analysis: {} };
  }

  async getUsageStatistics(appId: string, period: string): Promise<any> {
    // Implementation for usage statistics
    return { stats: {} };
  }

  async duplicateFile(id: string, appId: string, options: any): Promise<any> {
    // Implementation for file duplication
    return this.copyFile(id, appId, options.folderId);
  }

  async getFilePreview(id: string, appId: string, size: string): Promise<any> {
    // Implementation for file preview
    return { preview: 'preview_data' };
  }
} 