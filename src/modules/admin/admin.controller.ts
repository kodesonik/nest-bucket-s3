import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  Render,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UsersService } from '../users/users.service';
import { AppsService } from '../apps/apps.service';
import { FilesService } from '../files/files.service';
import { WebhookService } from '../webhooks/webhook.service';
import { AdminGuard } from '../../guards/admin.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SystemConfigDto } from './dto/system-config.dto';
import { MaintenanceDto } from './dto/maintenance.dto';
import { BackupDto } from './dto/backup.dto';

@ApiTags('Admin')
@ApiSecurity('AdminAuth')
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly usersService: UsersService,
    private readonly appsService: AppsService,
    private readonly filesService: FilesService,
    private readonly webhookService: WebhookService,
  ) {}

  // Dashboard Views
  @Get('dashboard')
  @Render('admin/dashboard')
  @ApiOperation({ summary: 'Admin dashboard home page' })
  async dashboard(@Req() request: any) {
    const stats = await this.adminService.getDashboardStats();
    const recentActivity = await this.adminService.getRecentActivity();
    const systemHealth = await this.adminService.getSystemHealth();
    
    return {
      title: 'Admin Dashboard',
      stats,
      recentActivity,
      systemHealth,
      user: request.user,
    };
  }

  @Get('users')
  @Render('admin/users')
  @ApiOperation({ summary: 'User management page' })
  async usersPage(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    const users = await this.usersService.getUsers({
      page,
      limit,
      search,
      role,
      status,
    });
    
    const stats = await this.usersService.getUserStats();
    
    return {
      title: 'User Management',
      users: users.users,
      pagination: {
        page: users.page,
        limit: users.limit,
        total: users.total,
        totalPages: users.pages,
      },
      stats,
      filters: { search, role, status },
    };
  }

  @Get('apps')
  @Render('admin/apps')
  @ApiOperation({ summary: 'Application management page' })
  async appsPage(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const apps = await this.appsService.getApps('admin');
    
    const stats = await this.appsService.getAppStats('admin', 'all');
    
    return {
      title: 'Application Management',
      apps: apps,
      pagination: {
        page,
        limit,
        total: apps.length,
        totalPages: Math.ceil(apps.length / limit),
      },
      stats,
      filters: { search, status },
    };
  }

  @Get('files')
  @Render('admin/files')
  @ApiOperation({ summary: 'File management page' })
  async filesPage(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('search') search?: string,
    @Query('type') type?: string,
  ) {
    const files = await this.filesService.getAllFiles({
      page,
      limit,
      search,
      type,
    });
    
    const stats = await this.filesService.getFileStats();
    
    return {
      title: 'File Management',
      files: files.files,
      pagination: files.pagination,
      stats,
      filters: { search, type },
    };
  }

  @Get('webhooks')
  @Render('admin/webhooks')
  @ApiOperation({ summary: 'Webhook management page' })
  async webhooksPage(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('status') status?: string,
  ) {
    const webhooks = await this.webhookService.getAllWebhooks({
      page,
      limit,
      status,
    });
    
    const stats = await this.webhookService.getWebhookStats();
    
    return {
      title: 'Webhook Management',
      webhooks: webhooks.webhooks,
      pagination: webhooks.pagination,
      stats,
      filters: { status },
    };
  }

  @Get('analytics')
  @Render('admin/analytics')
  @ApiOperation({ summary: 'Analytics and reporting page' })
  async analyticsPage(
    @Query('period') period: string = '30d',
    @Query('metric') metric?: string,
  ) {
    const analytics = await this.adminService.getAnalytics(period);
    const reports = await this.adminService.getReports(period);
    
    return {
      title: 'Analytics & Reports',
      analytics,
      reports,
      period,
      metric,
    };
  }

  @Get('settings')
  @Render('admin/settings')
  @ApiOperation({ summary: 'System settings page' })
  async settingsPage() {
    const config = await this.adminService.getSystemConfig();
    const features = await this.adminService.getFeatureFlags();
    
    return {
      title: 'System Settings',
      config,
      features,
    };
  }

  // API Endpoints
  @Get('api/stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics retrieved successfully' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('api/system-health')
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({ status: 200, description: 'System health retrieved successfully' })
  async getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  @Get('api/recent-activity')
  @ApiOperation({ summary: 'Get recent system activity' })
  @ApiResponse({ status: 200, description: 'Recent activity retrieved successfully' })
  async getRecentActivity(
    @Query('limit') limit: number = 50,
    @Query('type') type?: string,
  ) {
    return this.adminService.getRecentActivity(limit, type);
  }

  // User Management API
  @Post('api/users')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  async createUser(@Body() createUserDto: CreateUserDto, @Req() request: any) {
    return this.usersService.createUser(createUserDto, request.user.id);
  }

  @Put('api/users/:id')
  @ApiOperation({ summary: 'Update user details' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() request: any,
  ) {
    return this.usersService.updateUser(id, updateUserDto, request.user.id);
  }

  @Delete('api/users/:id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async deleteUser(@Param('id') id: string, @Req() request: any) {
    return this.usersService.deleteUser(id, request.user.id);
  }

  @Post('api/users/:id/suspend')
  @ApiOperation({ summary: 'Suspend a user account' })
  @ApiResponse({ status: 200, description: 'User suspended successfully' })
  async suspendUser(
    @Param('id') id: string,
    @Body('reason') reason?: string,
    @Req() request: any,
  ) {
    return this.usersService.suspendUser(id, reason, request.user.id);
  }

  @Post('api/users/:id/activate')
  @ApiOperation({ summary: 'Activate a user account' })
  @ApiResponse({ status: 200, description: 'User activated successfully' })
  async activateUser(@Param('id') id: string, @Req() request: any) {
    return this.usersService.activateUser(id, request.user.id);
  }

  @Post('api/users/:id/reset-password')
  @ApiOperation({ summary: 'Reset user password' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  async resetUserPassword(@Param('id') id: string, @Req() request: any) {
    return this.usersService.resetUserPassword(id, request.user.id);
  }

  @Get('api/users/:id/sessions')
  @ApiOperation({ summary: 'Get user active sessions' })
  @ApiResponse({ status: 200, description: 'User sessions retrieved successfully' })
  async getUserSessions(@Param('id') id: string) {
    return this.usersService.getUserSessions(id);
  }

  @Delete('api/users/:id/sessions/:sessionId')
  @ApiOperation({ summary: 'Terminate user session' })
  @ApiResponse({ status: 200, description: 'Session terminated successfully' })
  async terminateUserSession(
    @Param('id') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.usersService.terminateSession(userId, sessionId);
  }

  // App Management API
  @Post('api/apps/:id/suspend')
  @ApiOperation({ summary: 'Suspend an application' })
  @ApiResponse({ status: 200, description: 'Application suspended successfully' })
  async suspendApp(
    @Param('id') id: string,
    @Body('reason') reason?: string,
    @Req() request: any,
  ) {
    return this.appsService.suspendApp(id, reason, request.user.id);
  }

  @Post('api/apps/:id/activate')
  @ApiOperation({ summary: 'Activate an application' })
  @ApiResponse({ status: 200, description: 'Application activated successfully' })
  async activateApp(@Param('id') id: string, @Req() request: any) {
    return this.appsService.activateApp(id, request.user.id);
  }

  @Get('api/apps/:id/usage')
  @ApiOperation({ summary: 'Get application usage statistics' })
  @ApiResponse({ status: 200, description: 'Usage statistics retrieved successfully' })
  async getAppUsage(
    @Param('id') id: string,
    @Query('period') period: string = '30d',
  ) {
    return this.appsService.getAppUsage(id, period);
  }

  // File Management API
  @Delete('api/files/:id')
  @ApiOperation({ summary: 'Force delete a file' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  async forceDeleteFile(@Param('id') id: string, @Req() request: any) {
    return this.filesService.forceDeleteFile(id, request.user.id);
  }

  @Post('api/files/cleanup')
  @ApiOperation({ summary: 'Run file cleanup process' })
  @ApiResponse({ status: 200, description: 'Cleanup process started' })
  async runFileCleanup(@Body() options: any) {
    return this.adminService.runFileCleanup(options);
  }

  @Get('api/files/duplicates')
  @ApiOperation({ summary: 'Find duplicate files' })
  @ApiResponse({ status: 200, description: 'Duplicate files found' })
  async findDuplicateFiles(
    @Query('threshold') threshold: number = 0.95,
  ) {
    return this.adminService.findDuplicateFiles(threshold);
  }

  // System Configuration API
  @Get('api/config')
  @ApiOperation({ summary: 'Get system configuration' })
  @ApiResponse({ status: 200, description: 'System configuration retrieved successfully' })
  async getSystemConfig() {
    return this.adminService.getSystemConfig();
  }

  @Put('api/config')
  @ApiOperation({ summary: 'Update system configuration' })
  @ApiResponse({ status: 200, description: 'System configuration updated successfully' })
  async updateSystemConfig(
    @Body() configDto: SystemConfigDto,
    @Req() request: any,
  ) {
    return this.adminService.updateSystemConfig(configDto, request.user.id);
  }

  @Get('api/feature-flags')
  @ApiOperation({ summary: 'Get feature flags' })
  @ApiResponse({ status: 200, description: 'Feature flags retrieved successfully' })
  async getFeatureFlags() {
    return this.adminService.getFeatureFlags();
  }

  @Put('api/feature-flags')
  @ApiOperation({ summary: 'Update feature flags' })
  @ApiResponse({ status: 200, description: 'Feature flags updated successfully' })
  async updateFeatureFlags(@Body() flags: any, @Req() request: any) {
    return this.adminService.updateFeatureFlags(flags, request.user.id);
  }

  // Maintenance API
  @Post('api/maintenance/enable')
  @ApiOperation({ summary: 'Enable maintenance mode' })
  @ApiResponse({ status: 200, description: 'Maintenance mode enabled' })
  async enableMaintenance(@Body() maintenanceDto: MaintenanceDto) {
    return this.adminService.enableMaintenance(maintenanceDto);
  }

  @Post('api/maintenance/disable')
  @ApiOperation({ summary: 'Disable maintenance mode' })
  @ApiResponse({ status: 200, description: 'Maintenance mode disabled' })
  async disableMaintenance() {
    return this.adminService.disableMaintenance();
  }

  @Get('api/maintenance/status')
  @ApiOperation({ summary: 'Get maintenance status' })
  @ApiResponse({ status: 200, description: 'Maintenance status retrieved successfully' })
  async getMaintenanceStatus() {
    return this.adminService.getMaintenanceStatus();
  }

  // Backup and Restore API
  @Post('api/backup')
  @ApiOperation({ summary: 'Create system backup' })
  @ApiResponse({ status: 201, description: 'Backup created successfully' })
  async createBackup(@Body() backupDto: BackupDto, @Req() request: any) {
    return this.adminService.createBackup(backupDto, request.user.id);
  }

  @Get('api/backups')
  @ApiOperation({ summary: 'List system backups' })
  @ApiResponse({ status: 200, description: 'Backups retrieved successfully' })
  async listBackups() {
    return this.adminService.listBackups();
  }

  @Post('api/backups/:id/restore')
  @ApiOperation({ summary: 'Restore from backup' })
  @ApiResponse({ status: 200, description: 'Restore initiated successfully' })
  async restoreBackup(@Param('id') id: string, @Req() request: any) {
    return this.adminService.restoreBackup(id, request.user.id);
  }

  @Delete('api/backups/:id')
  @ApiOperation({ summary: 'Delete backup' })
  @ApiResponse({ status: 200, description: 'Backup deleted successfully' })
  async deleteBackup(@Param('id') id: string) {
    return this.adminService.deleteBackup(id);
  }

  // Analytics API
  @Get('api/analytics')
  @ApiOperation({ summary: 'Get system analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getAnalytics(
    @Query('period') period: string = '30d',
    @Query('metrics') metrics?: string,
  ) {
    return this.adminService.getAnalytics(period, metrics?.split(','));
  }

  @Get('api/reports')
  @ApiOperation({ summary: 'Get system reports' })
  @ApiResponse({ status: 200, description: 'Reports retrieved successfully' })
  async getReports(
    @Query('type') type?: string,
    @Query('period') period: string = '30d',
    @Query('format') format: string = 'json',
  ) {
    return this.adminService.getReports(period, type, format);
  }

  @Post('api/reports/generate')
  @ApiOperation({ summary: 'Generate custom report' })
  @ApiResponse({ status: 201, description: 'Report generation started' })
  async generateReport(@Body() reportConfig: any, @Req() request: any) {
    return this.adminService.generateReport(reportConfig, request.user.id);
  }

  // Audit Log API
  @Get('api/audit-logs')
  @ApiOperation({ summary: 'Get audit logs' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  async getAuditLogs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('resourceType') resourceType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.adminService.getAuditLogs({
      page,
      limit,
      action,
      userId,
      resourceType,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  // Security API
  @Get('api/security/threats')
  @ApiOperation({ summary: 'Get security threats' })
  @ApiResponse({ status: 200, description: 'Security threats retrieved successfully' })
  async getSecurityThreats(
    @Query('severity') severity?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getSecurityThreats(severity, status);
  }

  @Post('api/security/scan')
  @ApiOperation({ summary: 'Run security scan' })
  @ApiResponse({ status: 200, description: 'Security scan initiated' })
  async runSecurityScan(@Body() scanOptions: any) {
    return this.adminService.runSecurityScan(scanOptions);
  }

  @Get('api/security/firewall-rules')
  @ApiOperation({ summary: 'Get firewall rules' })
  @ApiResponse({ status: 200, description: 'Firewall rules retrieved successfully' })
  async getFirewallRules() {
    return this.adminService.getFirewallRules();
  }

  @Post('api/security/firewall-rules')
  @ApiOperation({ summary: 'Add firewall rule' })
  @ApiResponse({ status: 201, description: 'Firewall rule added successfully' })
  async addFirewallRule(@Body() rule: any, @Req() request: any) {
    return this.adminService.addFirewallRule(rule, request.user.id);
  }

  @Delete('api/security/firewall-rules/:id')
  @ApiOperation({ summary: 'Delete firewall rule' })
  @ApiResponse({ status: 200, description: 'Firewall rule deleted successfully' })
  async deleteFirewallRule(@Param('id') id: string) {
    return this.adminService.deleteFirewallRule(id);
  }
} 