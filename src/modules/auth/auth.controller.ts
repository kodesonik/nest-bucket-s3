import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Get,
  Put,
  Delete,
  BadRequestException,
  UnauthorizedException,
  Param,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Enable2FADto } from './dto/enable-2fa.dto';
import { Verify2FADto } from './dto/verify-2fa.dto';
// import { JwtAuthGuard } from './jwt-auth.guard'; // Using AuthGuard('jwt') instead

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto) {
    try {
      await this.authService.register(registerDto);
      return { message: 'Registration successful. Please check your email for verification.' };
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 423, description: 'Account locked' })
  async login(@Body() loginDto: LoginDto, @Request() req: any) {
    try {
      const result = await this.authService.login(
        loginDto.email,
        loginDto.password,
        {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          rememberDevice: loginDto.rememberDevice,
          twoFactorCode: loginDto.twoFactorCode,
        },
      );

      return {
        success: true,
        message: 'Login successful',
        data: result,
      };
    } catch (error) {
      const err = error as any;
      if (err.message?.includes('locked')) {
        throw new UnauthorizedException({
          message: err.message,
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          lockoutEndsAt: err.lockoutEndsAt,
        });
      }
      throw new UnauthorizedException((error as Error).message);
    }
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    try {
      const result = await this.authService.refreshToken(refreshToken);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Request() req: any, @Body('refreshToken') refreshToken?: string) {
    await this.authService.logout(req.user.userId, refreshToken);
    return {
      success: true,
      message: 'Logout successful',
    };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Body('token') token: string) {
    try {
      await this.authService.verifyEmail(token);
      return {
        success: true,
        message: 'Email verified successfully',
      };
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  async resendVerification(@Body('email') email: string) {
    await this.authService.resendEmailVerification(email);
    return {
      success: true,
      message: 'Verification email sent',
    };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async forgotPassword(@Body('email') email: string) {
    await this.authService.forgotPassword(email);
    return {
      success: true,
      message: 'Password reset email sent if account exists',
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    try {
      await this.authService.resetPassword(
        resetPasswordDto.token,
        resetPasswordDto.newPassword,
      );
      return {
        success: true,
        message: 'Password reset successfully',
      };
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  @Put('change-password')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password' })
  async changePassword(
    @Request() req: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    try {
      await this.authService.changePassword(
        req.user.userId,
        changePasswordDto.currentPassword,
        changePasswordDto.newPassword,
      );
      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getProfile(@Request() req: any) {
    const user = await this.authService.findById(req.user.userId);
    return {
      success: true,
      data: {
        id: user._id,
        email: user.email,
        name: user.profile.firstName + ' ' + user.profile.lastName,
        profile: user.profile,
        security: {
          emailVerified: user.emailVerified,
          twoFactorEnabled: user.twoFactor.enabled,
          lastLogin: user.security.lastLogin,
        },
        preferences: user.preferences,
      },
    };
  }

  @Put('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @Request() req: any,
    @Body() updateData: {
      firstName?: string;
      lastName?: string;
      avatar?: string;
      bio?: string;
      company?: string;
      website?: string;
      location?: string;
      preferences?: Record<string, any>;
    },
  ) {
    const updatedUser = await this.authService.updateProfile(req.user.userId, updateData);
    return {
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    };
  }

  @Post('enable-2fa')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable two-factor authentication' })
  @ApiResponse({ status: 200, description: '2FA setup initiated' })
  async enable2FA(@Request() req: any, @Body() enable2FADto: Enable2FADto) {
    try {
      const result = await this.authService.enable2FA(req.user.userId, enable2FADto.password);
      return {
        success: true,
        message: '2FA setup initiated',
        data: result,
      };
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  @Post('verify-2fa')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify and activate 2FA' })
  @ApiResponse({ status: 200, description: '2FA activated successfully' })
  async verify2FA(@Request() req: any, @Body() verify2FADto: Verify2FADto) {
    try {
      const result = await this.authService.verify2FA(
        req.user.userId,
        verify2FADto.token,
        verify2FADto.backupCode,
      );
      return {
        success: true,
        message: '2FA activated successfully',
        data: result,
      };
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  @Delete('disable-2fa')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable two-factor authentication' })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  async disable2FA(
    @Request() req: any,
    @Body() body: { password: string; token?: string },
  ) {
    try {
      await this.authService.disable2FA(req.user.userId, body.password, body.token);
      return {
        success: true,
        message: '2FA disabled successfully',
      };
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  @Get('sessions')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active sessions' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved successfully' })
  async getSessions(@Request() req: any) {
    const sessions = await this.authService.getActiveSessions(req.user.userId);
    return {
      success: true,
      data: sessions,
    };
  }

  @Delete('sessions/:sessionId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke session' })
  @ApiResponse({ status: 200, description: 'Session revoked successfully' })
  async revokeSession(@Request() req: any, @Body('sessionId') sessionId: string) {
    await this.authService.revokeSession(req.user.userId, sessionId);
    return {
      success: true,
      message: 'Session revoked successfully',
    };
  }

  @Delete('sessions')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all sessions except current' })
  @ApiResponse({ status: 200, description: 'All sessions revoked successfully' })
  async revokeAllSessions(@Request() req: any) {
    await this.authService.revokeAllSessions(req.user.userId, req.user.sessionId);
    return {
      success: true,
      message: 'All sessions revoked successfully',
    };
  }
} 