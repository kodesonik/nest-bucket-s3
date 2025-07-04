import {
  Controller,
  Post,
  Get,
  Delete,
  Put,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  Req,
  Res,
  StreamableFile,
  BadRequestException,
  HttpStatus,
  ParseBoolPipe,
  Optional,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiSecurity, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Express, Response } from 'express';
import { FilesService } from './files.service';
import { ApiKeyGuard } from '../../guards/api-key.guard';

// Type definition for uploaded files
interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}
import { UploadFileDto } from './dto/upload-file.dto';
import { UploadMultipleFilesDto } from './dto/upload-multiple-files.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { GetFilesQueryDto } from './dto/get-files-query.dto';
import { BulkOperationDto } from './dto/bulk-operation.dto';
import { CreateArchiveDto } from './dto/create-archive.dto';

@ApiTags('Files')
@ApiSecurity('ApiKeyAuth')
@ApiSecurity('AppIdAuth')
@Controller('files')
@UseGuards(ApiKeyGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a single file' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ 
    status: 201, 
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        filename: { type: 'string' },
        originalName: { type: 'string' },
        url: { type: 'string' },
        size: { type: 'number' },
        mimeType: { type: 'string' },
        thumbnailUrl: { type: 'string' },
        optimizedUrl: { type: 'string' },
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid file or upload parameters' })
  @ApiResponse({ status: 413, description: 'File too large' })
  async uploadFile(
    @UploadedFile() file: UploadedFile,
    @Body() uploadDto: UploadFileDto,
    @Req() request: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.filesService.uploadFile(
      file,
      uploadDto,
      request.app,
      request.ip,
      request.headers['user-agent'],
    );
  }

  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiOperation({ summary: 'Upload multiple files' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ 
    status: 201, 
    description: 'Files uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'array', items: { type: 'object' } },
        failed: { type: 'array', items: { type: 'object' } },
        totalUploaded: { type: 'number' },
        totalFailed: { type: 'number' },
      }
    }
  })
  async uploadMultipleFiles(
    @UploadedFiles() files: UploadedFile[],
    @Body() uploadDto: UploadMultipleFilesDto,
    @Req() request: any,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    return this.filesService.uploadMultipleFiles(
      files,
      uploadDto,
      request.app,
      request.ip,
      request.headers['user-agent'],
    );
  }

  @Post('upload-archive')
  @UseInterceptors(FileInterceptor('archive'))
  @ApiOperation({ summary: 'Upload and extract an archive file' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Archive uploaded and extracted successfully' })
  async uploadArchive(
    @UploadedFile() file: UploadedFile,
    @Body() uploadDto: UploadFileDto,
    @Req() request: any,
  ) {
    if (!file) {
      throw new BadRequestException('No archive file provided');
    }

    return this.filesService.uploadArchive(
      file,
      uploadDto,
      request.app,
      request.ip,
      request.headers['user-agent'],
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get list of files with pagination and filtering' })
  @ApiResponse({ 
    status: 200, 
    description: 'Files retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'object' } },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          }
        },
        filters: { type: 'object' },
      }
    }
  })
  async getFiles(
    @Query() query: GetFilesQueryDto,
    @Req() request: any,
  ) {
    return this.filesService.getFiles(query, request.app._id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file details by ID' })
  @ApiResponse({ status: 200, description: 'File details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFile(
    @Param('id') id: string,
    @Req() request: any,
  ) {
    return this.filesService.getFile(id, request.app._id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download a file' })
  @ApiResponse({ status: 200, description: 'File downloaded successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadFile(
    @Param('id') id: string,
    @Query('version') version?: string,
    @Req() request: any,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const result = await this.filesService.downloadFile(
      id,
      request.app._id,
      version,
      request.ip,
    );

    response.set({
      'Content-Type': result.mimeType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Content-Length': result.size.toString(),
    });

    return new StreamableFile(result.stream);
  }

  @Get(':id/stream')
  @ApiOperation({ summary: 'Stream a file (for video/audio)' })
  @ApiResponse({ status: 206, description: 'File streamed successfully' })
  async streamFile(
    @Param('id') id: string,
    @Req() request: any,
    @Res() response: Response,
  ) {
    return this.filesService.streamFile(
      id,
      request.app._id,
      request,
      response,
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update file metadata' })
  @ApiResponse({ status: 200, description: 'File updated successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async updateFile(
    @Param('id') id: string,
    @Body() updateDto: UpdateFileDto,
    @Req() request: any,
  ) {
    return this.filesService.updateFile(id, updateDto, request.app._id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a file' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async deleteFile(
    @Param('id') id: string,
    @Query('permanent') permanent?: boolean,
    @Req() request: any,
  ) {
    return this.filesService.deleteFile(
      id,
      request.app._id,
      permanent === true,
    );
  }

  @Post('bulk-operation')
  @ApiOperation({ summary: 'Perform bulk operations on multiple files' })
  @ApiResponse({ status: 200, description: 'Bulk operation completed' })
  async bulkOperation(
    @Body() bulkDto: BulkOperationDto,
    @Req() request: any,
  ) {
    return this.filesService.bulkOperation(bulkDto, request.app._id);
  }

  @Post('create-archive')
  @ApiOperation({ summary: 'Create an archive from multiple files' })
  @ApiResponse({ status: 201, description: 'Archive created successfully' })
  async createArchive(
    @Body() archiveDto: CreateArchiveDto,
    @Req() request: any,
  ) {
    return this.filesService.createArchive(archiveDto, request.app._id);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get file version history' })
  @ApiResponse({ status: 200, description: 'Version history retrieved successfully' })
  async getFileVersions(
    @Param('id') id: string,
    @Req() request: any,
  ) {
    return this.filesService.getFileVersions(id, request.app._id);
  }

  @Post(':id/restore/:versionId')
  @ApiOperation({ summary: 'Restore file to a specific version' })
  @ApiResponse({ status: 200, description: 'File restored successfully' })
  async restoreFileVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Req() request: any,
  ) {
    return this.filesService.restoreFileVersion(id, versionId, request.app._id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search files by content, name, or metadata' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  async searchFiles(
    @Query('q') query: string,
    @Query('type') type?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('minSize') minSize?: number,
    @Query('maxSize') maxSize?: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Req() request: any,
  ) {
    return this.filesService.searchFiles({
      query,
      type,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      minSize,
      maxSize,
      page,
      limit,
      appId: request.app._id,
    });
  }

  @Get(':id/share')
  @ApiOperation({ summary: 'Generate a shareable link for a file' })
  @ApiResponse({ status: 200, description: 'Share link generated successfully' })
  async generateShareLink(
    @Param('id') id: string,
    @Query('expiresIn') expiresIn?: number,
    @Query('password') password?: string,
    @Query('maxDownloads') maxDownloads?: number,
    @Req() request: any,
  ) {
    return this.filesService.generateShareLink(
      id,
      request.app._id,
      {
        expiresIn,
        password,
        maxDownloads,
      },
    );
  }

  @Post(':id/analyze')
  @ApiOperation({ summary: 'Analyze file content (OCR, image recognition, etc.)' })
  @ApiResponse({ status: 200, description: 'File analysis completed' })
  async analyzeFile(
    @Param('id') id: string,
    @Body() analysisOptions: any,
    @Req() request: any,
  ) {
    return this.filesService.analyzeFile(id, request.app._id, analysisOptions);
  }

  @Get('statistics/usage')
  @ApiOperation({ summary: 'Get file usage statistics' })
  @ApiResponse({ status: 200, description: 'Usage statistics retrieved successfully' })
  async getUsageStatistics(
    @Query('period') period: string = '30d',
    @Req() request: any,
  ) {
    return this.filesService.getUsageStatistics(request.app._id, period);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Create a duplicate of a file' })
  @ApiResponse({ status: 201, description: 'File duplicated successfully' })
  async duplicateFile(
    @Param('id') id: string,
    @Body() options: any,
    @Req() request: any,
  ) {
    return this.filesService.duplicateFile(id, request.app._id, options);
  }

  @Post(':id/move')
  @ApiOperation({ summary: 'Move file to a different folder' })
  @ApiResponse({ status: 200, description: 'File moved successfully' })
  async moveFile(
    @Param('id') id: string,
    @Body('folderId') folderId: string,
    @Req() request: any,
  ) {
    return this.filesService.moveFile(id, folderId, request.app._id);
  }

  @Post(':id/copy')
  @ApiOperation({ summary: 'Copy file to a different folder' })
  @ApiResponse({ status: 201, description: 'File copied successfully' })
  async copyFile(
    @Param('id') id: string,
    @Body('folderId') folderId: string,
    @Req() request: any,
  ) {
    return this.filesService.copyFile(id, folderId, request.app._id);
  }

  @Get(':id/preview')
  @ApiOperation({ summary: 'Get file preview (thumbnail or optimized version)' })
  @ApiResponse({ status: 200, description: 'File preview retrieved successfully' })
  async getFilePreview(
    @Param('id') id: string,
    @Query('size') size: string = 'medium',
    @Req() request: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.filesService.getFilePreview(
      id,
      request.app._id,
      size,
    );

    response.set({
      'Content-Type': result.mimeType,
      'Cache-Control': 'public, max-age=3600',
      'ETag': result.etag,
    });

    return new StreamableFile(result.stream);
  }
} 