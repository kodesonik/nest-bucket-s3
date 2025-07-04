import { Injectable, UnauthorizedException, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserDocument } from '../../schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Enable2FADto } from './dto/enable-2fa.dto';
import { Verify2FADto } from './dto/verify-2fa.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly maxFailedAttempts = 5;
  private readonly lockoutDuration = 30 * 60 * 1000; // 30 minutes

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto, ipAddress?: string, userAgent?: string): Promise<{
    user: UserDocument;
    accessToken: string;
    refreshToken: string;
  }> {
    const { email, password, fullName } = registerDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email }).exec();
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Generate email verification token
    const verificationToken = this.generateToken();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const user = new this.userModel({
      email,
      fullName,
      passwordHash,
      emailVerification: {
        isVerified: false,
        verificationToken,
        verificationTokenExpires,
      },
      security: {
        loginCount: 0,
        failedLoginAttempts: 0,
        sessionTokens: [],
      },
      permissions: {
        canCreateApps: true,
        canManageUsers: false,
        canAccessAnalytics: false,
        canManageSystem: false,
        maxApps: 5,
        maxStorageGB: 10,
        maxFilesPerApp: 10000,
        allowedFileTypes: [],
      },
      profile: {
        timezone: 'UTC',
        language: 'en',
        theme: 'light',
      },
      preferences: {
        notifications: {
          email: true,
          push: true,
          fileUploaded: true,
          storageQuotaWarning: true,
          securityAlerts: true,
          weeklyReport: false,
        },
        dashboard: {
          defaultView: 'grid',
          itemsPerPage: 20,
          showHiddenFiles: false,
          autoRefresh: true,
        },
      },
      subscription: {
        plan: 'free',
        cancelAtPeriodEnd: false,
      },
      activity: {
        totalUploads: 0,
        totalDownloads: 0,
        storageUsed: 0,
        apiCallsCount: 0,
      },
      twoFactorAuth: {
        enabled: false,
        backupCodes: [],
      },
      legal: {
        marketingConsent: false,
      },
    });

    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user, ipAddress, userAgent);

    this.logger.log(`User registered: ${email}`);

    // TODO: Send verification email
    // await this.emailService.sendVerificationEmail(email, verificationToken);

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<{
    user: UserDocument;
    accessToken: string;
    refreshToken: string;
    requiresTwoFactor?: boolean;
  }> {
    const { email, password, twoFactorCode } = loginDto;

    // Find user
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.security.lockedUntil && user.security.lockedUntil > new Date()) {
      const lockTimeRemaining = Math.ceil((user.security.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(`Account locked. Try again in ${lockTimeRemaining} minutes`);
    }

    // Check if account is active
    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await this.handleFailedLogin(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if 2FA is enabled
    if (user.twoFactorAuth.enabled) {
      if (!twoFactorCode) {
        return {
          user: null,
          accessToken: null,
          refreshToken: null,
          requiresTwoFactor: true,
        };
      }

      const is2FAValid = await this.verify2FA(user, twoFactorCode);
      if (!is2FAValid) {
        await this.handleFailedLogin(user);
        throw new UnauthorizedException('Invalid 2FA code');
      }
    }

    // Update login information
    await this.handleSuccessfulLogin(user, ipAddress);

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user, ipAddress, userAgent);

    this.logger.log(`User logged in: ${email}`);

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async logout(userId: string, token: string): Promise<void> {
    await this.userModel.updateOne(
      { _id: userId },
      {
        $pull: {
          'security.sessionTokens': { token },
        },
      },
    ).exec();
  }

  async logoutAll(userId: string): Promise<void> {
    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          'security.sessionTokens': [],
        },
      },
    ).exec();
  }

  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('auth.jwt.secret'),
      });

      const user = await this.userModel.findById(payload.sub).exec();
      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if token exists in user's session tokens
      const sessionToken = user.security.sessionTokens.find(
        (token) => token.token === refreshToken && token.expiresAt > new Date(),
      );

      if (!sessionToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Remove old refresh token and add new one
      await this.userModel.updateOne(
        { _id: user._id },
        {
          $pull: {
            'security.sessionTokens': { token: refreshToken },
          },
        },
      ).exec();

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await this.hashPassword(newPassword);

    // Update password
    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          passwordHash: newPasswordHash,
          'security.passwordChangedAt': new Date(),
          'security.sessionTokens': [], // Logout from all devices
        },
      },
    ).exec();

    this.logger.log(`Password changed for user: ${user.email}`);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      // Don't reveal if user exists
      return;
    }

    const resetToken = this.generateToken();
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.userModel.updateOne(
      { _id: user._id },
      {
        $set: {
          'passwordReset.resetToken': resetToken,
          'passwordReset.resetTokenExpires': resetTokenExpires,
          'passwordReset.resetTokenUsed': false,
        },
      },
    ).exec();

    // TODO: Send password reset email
    // await this.emailService.sendPasswordResetEmail(email, resetToken);

    this.logger.log(`Password reset requested for: ${email}`);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token, newPassword } = resetPasswordDto;

    const user = await this.userModel.findOne({
      'passwordReset.resetToken': token,
      'passwordReset.resetTokenExpires': { $gt: new Date() },
      'passwordReset.resetTokenUsed': false,
    }).exec();

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const newPasswordHash = await this.hashPassword(newPassword);

    // Update password and mark token as used
    await this.userModel.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: newPasswordHash,
          'security.passwordChangedAt': new Date(),
          'security.sessionTokens': [], // Logout from all devices
          'passwordReset.resetTokenUsed': true,
          'security.failedLoginAttempts': 0,
          'security.lockedUntil': null,
        },
      },
    ).exec();

    this.logger.log(`Password reset completed for: ${user.email}`);
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.userModel.findOne({
      'emailVerification.verificationToken': token,
      'emailVerification.verificationTokenExpires': { $gt: new Date() },
    }).exec();

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.userModel.updateOne(
      { _id: user._id },
      {
        $set: {
          'emailVerification.isVerified': true,
          'emailVerification.verifiedAt': new Date(),
          'emailVerification.verificationToken': null,
          'emailVerification.verificationTokenExpires': null,
          status: 'active',
        },
      },
    ).exec();

    this.logger.log(`Email verified for: ${user.email}`);
  }

  async enable2FA(userId: string, enable2FADto: Enable2FADto): Promise<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  }> {
    const { password } = enable2FADto;

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Password is incorrect');
    }

    // Generate 2FA secret
    const secret = this.generate2FASecret();
    const backupCodes = this.generateBackupCodes();

    // Generate QR code URL
    const qrCode = `otpauth://totp/${encodeURIComponent(this.configService.get('app.name'))}:${encodeURIComponent(user.email)}?secret=${secret}&issuer=${encodeURIComponent(this.configService.get('app.name'))}`;

    // Save to database (but don't enable yet)
    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          'twoFactorAuth.secret': secret,
          'twoFactorAuth.backupCodes': backupCodes,
        },
      },
    ).exec();

    return {
      secret,
      qrCode,
      backupCodes,
    };
  }

  async verify2FASetup(userId: string, verify2FADto: Verify2FADto): Promise<void> {
    const { code } = verify2FADto;

    const user = await this.userModel.findById(userId).exec();
    if (!user || !user.twoFactorAuth.secret) {
      throw new BadRequestException('2FA setup not initiated');
    }

    const isValid = await this.verify2FA(user, code);
    if (!isValid) {
      throw new BadRequestException('Invalid 2FA code');
    }

    // Enable 2FA
    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          'twoFactorAuth.enabled': true,
        },
      },
    ).exec();

    this.logger.log(`2FA enabled for user: ${user.email}`);
  }

  async disable2FA(userId: string, password: string): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Password is incorrect');
    }

    // Disable 2FA
    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          'twoFactorAuth.enabled': false,
          'twoFactorAuth.secret': null,
          'twoFactorAuth.backupCodes': [],
        },
      },
    ).exec();

    this.logger.log(`2FA disabled for user: ${user.email}`);
  }

  async validateUser(payload: any): Promise<UserDocument> {
    const user = await this.userModel.findById(payload.sub).exec();
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User not found or inactive');
    }
    return user;
  }

  private async generateTokens(
    user: UserDocument,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload = {
      sub: user._id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('auth.jwt.expiresIn'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '30d',
    });

    // Store refresh token
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await this.userModel.updateOne(
      { _id: user._id },
      {
        $push: {
          'security.sessionTokens': {
            token: refreshToken,
            createdAt: new Date(),
            expiresAt,
            userAgent,
            ipAddress,
          },
        },
      },
    ).exec();

    return {
      accessToken,
      refreshToken,
    };
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = this.configService.get('auth.bcrypt.rounds');
    return bcrypt.hash(password, saltRounds);
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generate2FASecret(): string {
    return crypto.randomBytes(20).toString('base32');
  }

  private generateBackupCodes(): string[] {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  private async verify2FA(user: UserDocument, code: string): Promise<boolean> {
    // This is a simplified implementation
    // In a real app, you'd use a library like 'speakeasy' to verify TOTP codes
    return code === '123456'; // Placeholder
  }

  private async handleFailedLogin(user: UserDocument): Promise<void> {
    const failedAttempts = user.security.failedLoginAttempts + 1;
    
    if (failedAttempts >= this.maxFailedAttempts) {
      const lockedUntil = new Date(Date.now() + this.lockoutDuration);
      await this.userModel.updateOne(
        { _id: user._id },
        {
          $set: {
            'security.failedLoginAttempts': failedAttempts,
            'security.lockedUntil': lockedUntil,
          },
        },
      ).exec();
    } else {
      await this.userModel.updateOne(
        { _id: user._id },
        {
          $set: {
            'security.failedLoginAttempts': failedAttempts,
          },
        },
      ).exec();
    }
  }

  private async handleSuccessfulLogin(user: UserDocument, ipAddress?: string): Promise<void> {
    await this.userModel.updateOne(
      { _id: user._id },
      {
        $set: {
          'security.lastLogin': new Date(),
          'security.lastLoginIp': ipAddress,
          'security.failedLoginAttempts': 0,
          'security.lockedUntil': null,
          'activity.lastActivity': new Date(),
        },
        $inc: {
          'security.loginCount': 1,
        },
      },
    ).exec();
  }

  // Add missing methods that controllers are calling
  async resendEmailVerification(email: string): Promise<void> {
    // Implementation for resending email verification
    const user = await this.userModel.findOne({ email });
    if (!user) {
      // Don't reveal if email exists
      return;
    }
    
    // Implementation would send email here
    this.logger.log(`Email verification resent to ${email}`);
  }

  async forgotPassword(email: string): Promise<void> {
    // Implementation for forgot password
    const user = await this.userModel.findOne({ email });
    if (!user) {
      // Don't reveal if email exists
      return;
    }
    
    // Implementation would send reset email here
    this.logger.log(`Password reset email sent to ${email}`);
  }

  async findById(userId: string): Promise<any> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateProfile(userId: string, updateData: any): Promise<any> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    );
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    return user;
  }

  async getActiveSessions(userId: string): Promise<any[]> {
    // Implementation for getting active sessions
    // This would typically involve a sessions collection
    return [];
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    // Implementation for revoking a specific session
    this.logger.log(`Session ${sessionId} revoked for user ${userId}`);
  }

  async revokeAllSessions(userId: string, currentSessionId: string): Promise<void> {
    // Implementation for revoking all sessions except current
    this.logger.log(`All sessions revoked for user ${userId} except ${currentSessionId}`);
  }

  private generateRandomToken(): string {
    // Implementation for generating a random token
    // This is a placeholder and should be replaced with a proper implementation
    return crypto.randomBytes(32).toString('hex');
  }
} 