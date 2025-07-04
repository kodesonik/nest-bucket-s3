import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import sharp from 'sharp';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3: AWS.S3;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.initializeS3();
  }

  private initializeS3() {
    const storageConfig = this.configService.get('storage.digitalOcean');
    this.bucketName = storageConfig.bucket;

    this.s3 = new AWS.S3({
      endpoint: storageConfig.endpoint,
      accessKeyId: storageConfig.accessKeyId,
      secretAccessKey: storageConfig.secretAccessKey,
      region: storageConfig.region,
      signatureVersion: storageConfig.signatureVersion,
      s3ForcePathStyle: storageConfig.s3ForcePathStyle,
    });

    this.logger.log(`Initialized DigitalOcean Spaces: ${storageConfig.endpoint}`);
  }

  async uploadFile(
    buffer: Buffer,
    filename: string,
    folder?: string,
    contentType?: string,
  ): Promise<string> {
    try {
      const fileExtension = path.extname(filename);
      const uniqueFilename = `${uuidv4()}${fileExtension}`;
      const key = folder ? `${folder}/${uniqueFilename}` : uniqueFilename;

      const params: AWS.S3.PutObjectRequest = {
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ACL: 'public-read',
        ContentType: contentType,
        Metadata: {
          originalName: filename,
          uploadedAt: new Date().toISOString(),
        },
      };

      const result = await this.s3.upload(params).promise();
      this.logger.log(`File uploaded successfully: ${key}`);
      
      return result.Location;
    } catch (error) {
      this.logger.error(`Failed to upload file: ${(error as Error).message}`);
      throw new Error(`Upload failed: ${(error as Error).message}`);
    }
  }

  async uploadMultipleFiles(
    files: Array<{ buffer: Buffer; filename: string; contentType?: string }>,
    folder?: string,
  ): Promise<string[]> {
    try {
      const uploadPromises = files.map(file =>
        this.uploadFile(file.buffer, file.filename, folder, file.contentType)
      );

      const results = await Promise.all(uploadPromises);
      this.logger.log(`Successfully uploaded ${results.length} files`);
      
      return results;
    } catch (error) {
      this.logger.error(`Failed to upload multiple files: ${(error as Error).message}`);
      throw new Error(`Multiple upload failed: ${(error as Error).message}`);
    }
  }

  async deleteFile(fileUrl: string): Promise<boolean> {
    try {
      // Extract key from URL
      const key = this.extractKeyFromUrl(fileUrl);
      
      const params: AWS.S3.DeleteObjectRequest = {
        Bucket: this.bucketName,
        Key: key,
      };

      await this.s3.deleteObject(params).promise();
      this.logger.log(`File deleted successfully: ${key}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete file: ${(error as Error).message}`);
      throw new Error(`Delete failed: ${(error as Error).message}`);
    }
  }

  async deleteMultipleFiles(fileUrls: string[]): Promise<boolean> {
    try {
      const keys = fileUrls.map(url => this.extractKeyFromUrl(url));
      
      const params: AWS.S3.DeleteObjectsRequest = {
        Bucket: this.bucketName,
        Delete: {
          Objects: keys.map(key => ({ Key: key })),
          Quiet: false,
        },
      };

      await this.s3.deleteObjects(params).promise();
      this.logger.log(`Successfully deleted ${keys.length} files`);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete multiple files: ${(error as Error).message}`);
      throw new Error(`Multiple delete failed: ${(error as Error).message}`);
    }
  }

  async getFileMetadata(fileUrl: string): Promise<AWS.S3.HeadObjectOutput> {
    try {
      const key = this.extractKeyFromUrl(fileUrl);
      
      const params: AWS.S3.HeadObjectRequest = {
        Bucket: this.bucketName,
        Key: key,
      };

      const result = await this.s3.headObject(params).promise();
      return result;
    } catch (error) {
      this.logger.error(`Failed to get file metadata: ${(error as Error).message}`);
      throw new Error(`Metadata retrieval failed: ${(error as Error).message}`);
    }
  }

  async listFiles(
    folder?: string,
    maxKeys: number = 1000,
    continuationToken?: string,
  ): Promise<{
    files: Array<{
      key: string;
      size: number;
      lastModified: Date;
      url: string;
    }>;
    nextContinuationToken?: string;
    isTruncated: boolean;
  }> {
    try {
      const params: AWS.S3.ListObjectsV2Request = {
        Bucket: this.bucketName,
        MaxKeys: maxKeys,
        ContinuationToken: continuationToken,
        Prefix: folder ? `${folder}/` : undefined,
      };

      const result = await this.s3.listObjectsV2(params).promise();
      
      const files = (result.Contents || []).map(obj => ({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
        url: this.getFileUrl(obj.Key),
      }));

      return {
        files,
        nextContinuationToken: result.NextContinuationToken,
        isTruncated: result.IsTruncated || false,
      };
    } catch (error) {
      this.logger.error(`Failed to list files: ${(error as Error).message}`);
      throw new Error(`File listing failed: ${(error as Error).message}`);
    }
  }

  async generateThumbnail(
    imageBuffer: Buffer,
    filename: string,
    folder?: string,
  ): Promise<string> {
    try {
      const appConfig = this.configService.get('app.fileProcessing.image');
      
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(appConfig.thumbnailWidth, appConfig.thumbnailHeight, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: appConfig.quality })
        .toBuffer();

      const thumbnailFolder = folder ? `${folder}/thumbnails` : 'thumbnails';
      const thumbnailFilename = `thumb_${filename}`;

      return await this.uploadFile(
        thumbnailBuffer,
        thumbnailFilename,
        thumbnailFolder,
        'image/jpeg',
      );
    } catch (error) {
      this.logger.error(`Failed to generate thumbnail: ${(error as Error).message}`);
      throw new Error(`Thumbnail generation failed: ${(error as Error).message}`);
    }
  }

  async optimizeImage(
    imageBuffer: Buffer,
    filename: string,
    folder?: string,
  ): Promise<string> {
    try {
      const appConfig = this.configService.get('app.fileProcessing.image');
      
      const optimizedBuffer = await sharp(imageBuffer)
        .resize(appConfig.maxWidth, appConfig.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: appConfig.quality })
        .toBuffer();

      return await this.uploadFile(
        optimizedBuffer,
        filename,
        folder,
        'image/jpeg',
      );
    } catch (error) {
      this.logger.error(`Failed to optimize image: ${(error as Error).message}`);
      throw new Error(`Image optimization failed: ${(error as Error).message}`);
    }
  }

  private extractKeyFromUrl(fileUrl: string): string {
    try {
      const url = new URL(fileUrl);
      return url.pathname.substring(1); // Remove leading slash
    } catch (error) {
      this.logger.error(`Invalid file URL: ${fileUrl}`);
      throw new Error('Invalid file URL');
    }
  }

  private getFileUrl(key: string): string {
    const endpoint = this.configService.get('storage.digitalOcean.endpoint');
    return `${endpoint}/${this.bucketName}/${key}`;
  }

  async getSignedUrl(key: string, expires: number = 3600): Promise<string> {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: key,
        Expires: expires,
      };

      return await this.s3.getSignedUrlPromise('getObject', params);
    } catch (error) {
      this.logger.error(`Failed to generate signed URL: ${(error as Error).message}`);
      throw new Error(`Signed URL generation failed: ${(error as Error).message}`);
    }
  }
} 