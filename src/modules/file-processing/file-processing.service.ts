import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import * as archiver from 'archiver';
import * as unzipper from 'unzipper';
import * as pdf from 'pdf-parse';
import * as fs from 'fs';
import * as path from 'path';
import { StorageService } from '../storage/storage.service';
import { FileProcessingOptionsDto } from './dto/file-processing-options.dto';

export interface ProcessingResult {
  success: boolean;
  originalUrl?: string;
  optimizedUrl?: string;
  thumbnailUrl?: string;
  metadata?: any;
  error?: string;
}

@Injectable()
export class FileProcessingService {
  private readonly logger = new Logger(FileProcessingService.name);

  constructor(
    private configService: ConfigService,
    private storageService: StorageService,
  ) {}

  async processFile(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    options: FileProcessingOptionsDto = {},
  ): Promise<ProcessingResult> {
    try {
      const fileType = this.getFileType(mimeType);
      this.logger.log(`Processing ${fileType} file: ${filename}`);

      switch (fileType) {
        case 'image':
          return await this.processImage(buffer, filename, options);
        case 'video':
          return await this.processVideo(buffer, filename, options);
        case 'document':
          return await this.processDocument(buffer, filename, options);
        case 'audio':
          return await this.processAudio(buffer, filename, options);
        case 'archive':
          return await this.processArchive(buffer, filename, options);
        default:
          return await this.processGenericFile(buffer, filename, options);
      }
    } catch (error) {
      this.logger.error(`Error processing file ${filename}: ${(error as Error).message}`);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async processImage(
    buffer: Buffer,
    filename: string,
    options: FileProcessingOptionsDto = {},
  ): Promise<ProcessingResult> {
    const result: ProcessingResult = { success: true };

    try {
      // Extract metadata
      const imageInfo = await sharp(buffer).metadata();
      result.metadata = {
        width: imageInfo.width,
        height: imageInfo.height,
        format: imageInfo.format,
        channels: imageInfo.channels,
        hasAlpha: imageInfo.hasAlpha,
        colorSpace: imageInfo.space,
        density: imageInfo.density,
        compression: imageInfo.compression,
      };

      // Upload original
      if (options.preserveOriginal !== false) {
        result.originalUrl = await this.storageService.uploadFile(
          buffer,
          filename,
          options.folder || 'images',
          `image/${imageInfo.format}`,
        );
      }

      // Generate optimized version
      if (options.optimizeImage !== false) {
        const optimizedBuffer = await this.optimizeImage(buffer, options);
        const optimizedFilename = this.addSuffix(filename, '_optimized');
        result.optimizedUrl = await this.storageService.uploadFile(
          optimizedBuffer,
          optimizedFilename,
          options.folder || 'images',
          'image/jpeg',
        );
      }

      // Generate thumbnail
      if (options.generateThumbnail !== false) {
        const thumbnailBuffer = await this.generateImageThumbnail(buffer, options);
        const thumbnailFilename = this.addSuffix(filename, '_thumb');
        result.thumbnailUrl = await this.storageService.uploadFile(
          thumbnailBuffer,
          thumbnailFilename,
          options.folder ? `${options.folder}/thumbnails` : 'thumbnails',
          'image/jpeg',
        );
      }

      // Content analysis (optional)
      if (options.analyzeContent) {
        result.metadata.analysis = await this.analyzeImageContent(buffer);
      }

      return result;
    } catch (error) {
      this.logger.error(`Image processing error: ${(error as Error).message}`);
      return { success: false, error: (error as Error).message };
    }
  }

  async processVideo(
    buffer: Buffer,
    filename: string,
    options: FileProcessingOptionsDto = {},
  ): Promise<ProcessingResult> {
    const result: ProcessingResult = { success: true };

    try {
      // Save temporary file for ffmpeg processing
      const tempPath = path.join('/tmp', `${Date.now()}_${filename}`);
      fs.writeFileSync(tempPath, buffer);

      // Extract metadata
      const metadata = await this.getVideoMetadata(tempPath);
      result.metadata = metadata;

      // Upload original
      if (options.preserveOriginal !== false) {
        result.originalUrl = await this.storageService.uploadFile(
          buffer,
          filename,
          options.folder || 'videos',
          'video/mp4',
        );
      }

      // Generate thumbnail from video
      if (options.generateThumbnail !== false) {
        const thumbnailBuffer = await this.generateVideoThumbnail(tempPath);
        const thumbnailFilename = this.addSuffix(filename, '_thumb', '.jpg');
        result.thumbnailUrl = await this.storageService.uploadFile(
          thumbnailBuffer,
          thumbnailFilename,
          options.folder ? `${options.folder}/thumbnails` : 'thumbnails',
          'image/jpeg',
        );
      }

      // Compress video (optional)
      if (options.compressVideo) {
        const compressedBuffer = await this.compressVideo(tempPath);
        const compressedFilename = this.addSuffix(filename, '_compressed');
        result.optimizedUrl = await this.storageService.uploadFile(
          compressedBuffer,
          compressedFilename,
          options.folder || 'videos',
          'video/mp4',
        );
      }

      // Clean up temp file
      fs.unlinkSync(tempPath);

      return result;
    } catch (error) {
      this.logger.error(`Video processing error: ${(error as Error).message}`);
      return { success: false, error: (error as Error).message };
    }
  }

  async processDocument(
    buffer: Buffer,
    filename: string,
    options: FileProcessingOptionsDto = {},
  ): Promise<ProcessingResult> {
    const result: ProcessingResult = { success: true };

    try {
      // Upload original
      result.originalUrl = await this.storageService.uploadFile(
        buffer,
        filename,
        options.folder || 'documents',
        'application/pdf',
      );

      // Extract text content for PDFs
      if (filename.toLowerCase().endsWith('.pdf')) {
        const pdfData = await pdf(buffer);
        result.metadata = {
          pages: pdfData.numpages,
          text: options.extractText ? pdfData.text : undefined,
          info: pdfData.info,
        };

        // Generate thumbnail from first page
        if (options.generateThumbnail !== false) {
          const thumbnailBuffer = await this.generatePdfThumbnail(buffer);
          const thumbnailFilename = this.addSuffix(filename, '_thumb', '.jpg');
          result.thumbnailUrl = await this.storageService.uploadFile(
            thumbnailBuffer,
            thumbnailFilename,
            options.folder ? `${options.folder}/thumbnails` : 'thumbnails',
            'image/jpeg',
          );
        }
      }

      // OCR processing (optional)
      if (options.performOCR) {
        result.metadata.ocrText = await this.performOCR(buffer, filename);
      }

      return result;
    } catch (error) {
      this.logger.error(`Document processing error: ${(error as Error).message}`);
      return { success: false, error: (error as Error).message };
    }
  }

  async processAudio(
    buffer: Buffer,
    filename: string,
    options: FileProcessingOptionsDto = {},
  ): Promise<ProcessingResult> {
    const result: ProcessingResult = { success: true };

    try {
      // Save temporary file for ffmpeg processing
      const tempPath = path.join('/tmp', `${Date.now()}_${filename}`);
      fs.writeFileSync(tempPath, buffer);

      // Extract metadata
      const metadata = await this.getAudioMetadata(tempPath);
      result.metadata = metadata;

      // Upload original
      result.originalUrl = await this.storageService.uploadFile(
        buffer,
        filename,
        options.folder || 'audio',
        'audio/mpeg',
      );

      // Generate waveform thumbnail
      if (options.generateThumbnail !== false) {
        const waveformBuffer = await this.generateWaveform(tempPath);
        const waveformFilename = this.addSuffix(filename, '_waveform', '.png');
        result.thumbnailUrl = await this.storageService.uploadFile(
          waveformBuffer,
          waveformFilename,
          options.folder ? `${options.folder}/thumbnails` : 'thumbnails',
          'image/png',
        );
      }

      // Clean up temp file
      fs.unlinkSync(tempPath);

      return result;
    } catch (error) {
      this.logger.error(`Audio processing error: ${(error as Error).message}`);
      return { success: false, error: (error as Error).message };
    }
  }

  async processArchive(
    buffer: Buffer,
    filename: string,
    options: FileProcessingOptionsDto = {},
  ): Promise<ProcessingResult> {
    const result: ProcessingResult = { success: true };

    try {
      // Upload original
      result.originalUrl = await this.storageService.uploadFile(
        buffer,
        filename,
        options.folder || 'archives',
        'application/zip',
      );

      // Extract archive information
      if (options.analyzeArchive) {
        result.metadata = await this.analyzeArchive(buffer);
      }

      // Extract files (optional)
      if (options.extractArchive) {
        const extractedFiles = await this.extractArchive(buffer, filename, options);
        result.metadata = {
          ...result.metadata,
          extractedFiles,
        };
      }

      return result;
    } catch (error) {
      this.logger.error(`Archive processing error: ${(error as Error).message}`);
      return { success: false, error: (error as Error).message };
    }
  }

  async processGenericFile(
    buffer: Buffer,
    filename: string,
    options: FileProcessingOptionsDto = {},
  ): Promise<ProcessingResult> {
    const result: ProcessingResult = { success: true };

    try {
      // Basic file information
      result.metadata = {
        size: buffer.length,
        encoding: 'binary',
      };

      // Upload original
      result.originalUrl = await this.storageService.uploadFile(
        buffer,
        filename,
        options.folder || 'files',
        'application/octet-stream',
      );

      // Virus scan (if enabled)
      if (options.virusScan) {
        const scanResult = await this.performVirusScan(buffer);
        result.metadata.virusScanResult = scanResult;
        
        if (!scanResult.clean) {
          throw new Error(`Virus detected: ${scanResult.threat}`);
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Generic file processing error: ${(error as Error).message}`);
      return { success: false, error: (error as Error).message };
    }
  }

  // Helper methods
  private getFileType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document';
    if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) return 'archive';
    return 'other';
  }

  private async optimizeImage(buffer: Buffer, options: FileProcessingOptionsDto = {}): Promise<Buffer> {
    const config = this.configService.get('app.fileProcessing.image');
    
    return await sharp(buffer)
      .resize(
        options.maxWidth || config.maxWidth,
        options.maxHeight || config.maxHeight,
        {
          fit: 'inside',
          withoutEnlargement: true,
        }
      )
      .jpeg({ 
        quality: options.quality || config.quality,
        progressive: true 
      })
      .toBuffer();
  }

  private async generateImageThumbnail(buffer: Buffer, options: FileProcessingOptionsDto = {}): Promise<Buffer> {
    const config = this.configService.get('app.fileProcessing.image');
    
    return await sharp(buffer)
      .resize(
        options.thumbnailWidth || config.thumbnailWidth,
        options.thumbnailHeight || config.thumbnailHeight,
        {
          fit: 'cover',
          position: 'center',
        }
      )
      .jpeg({ quality: 80 })
      .toBuffer();
  }

  private async generateVideoThumbnail(videoPath: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const outputPath = `${videoPath}_thumb.jpg`;
      
      ffmpeg(videoPath)
        .screenshots({
          timestamps: ['00:00:01'],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: '200x200'
        })
        .on('end', () => {
          const buffer = fs.readFileSync(outputPath);
          fs.unlinkSync(outputPath);
          resolve(buffer);
        })
        .on('error', reject);
    });
  }

  private async generatePdfThumbnail(buffer: Buffer): Promise<Buffer> {
    // This would require pdf2pic or similar library
    // For now, return a placeholder
    return Buffer.from('PDF thumbnail placeholder');
  }

  private async generateWaveform(audioPath: string): Promise<Buffer> {
    // This would require audiowaveform or similar library
    // For now, return a placeholder
    return Buffer.from('Audio waveform placeholder');
  }

  private async getVideoMetadata(videoPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });
  }

  private async getAudioMetadata(audioPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });
  }

  private async compressVideo(videoPath: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const outputPath = `${videoPath}_compressed.mp4`;
      
      ffmpeg(videoPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .size('50%')
        .output(outputPath)
        .on('end', () => {
          const buffer = fs.readFileSync(outputPath);
          fs.unlinkSync(outputPath);
          resolve(buffer);
        })
        .on('error', reject)
        .run();
    });
  }

  private async analyzeImageContent(buffer: Buffer): Promise<any> {
    // This would integrate with Google Vision API or similar
    return { analyzed: false, reason: 'Content analysis not implemented' };
  }

  private async performOCR(buffer: Buffer, filename: string): Promise<string> {
    // This would integrate with Tesseract or similar OCR engine
    return 'OCR not implemented';
  }

  private async analyzeArchive(buffer: Buffer): Promise<any> {
    const files = [];
    let totalSize = 0;

    return new Promise((resolve) => {
      const stream = require('stream');
      const bufferStream = new stream.PassThrough();
      bufferStream.end(buffer);

      bufferStream
        .pipe(unzipper.Parse())
        .on('entry', (entry) => {
          files.push({
            name: entry.path,
            type: entry.type,
            size: entry.size,
          });
          totalSize += entry.size || 0;
          entry.autodrain();
        })
        .on('close', () => {
          resolve({
            fileCount: files.length,
            totalSize,
            files: files.slice(0, 100), // Limit to first 100 files
          });
        });
    });
  }

  private async extractArchive(buffer: Buffer, filename: string, options: FileProcessingOptionsDto): Promise<string[]> {
    // This would extract files and upload them to storage
    return ['extraction not implemented'];
  }

  private async performVirusScan(buffer: Buffer): Promise<{ clean: boolean; threat?: string }> {
    // This would integrate with ClamAV or similar antivirus
    return { clean: true };
  }

  private addSuffix(filename: string, suffix: string, newExtension?: string): string {
    const ext = newExtension || path.extname(filename);
    const name = path.basename(filename, path.extname(filename));
    return `${name}${suffix}${ext}`;
  }
} 