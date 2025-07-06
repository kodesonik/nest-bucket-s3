import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @ApiProperty({ description: 'User full name', example: 'John Doe' })
  @Prop({ required: true, trim: true })
  fullName: string;

  @ApiProperty({ description: 'User password hash' })
  @Prop({ required: true })
  passwordHash: string;

  @ApiProperty({ description: 'User role', enum: ['admin', 'user', 'viewer'] })
  @Prop({ 
    type: String, 
    enum: ['admin', 'user', 'viewer'], 
    default: 'user' 
  })
  role: string;

  @ApiProperty({ description: 'User status', enum: ['active', 'inactive', 'suspended', 'pending'] })
  @Prop({ 
    type: String, 
    enum: ['active', 'inactive', 'suspended', 'pending'], 
    default: 'pending' 
  })
  status: string;

  @ApiProperty({ description: 'User profile information' })
  @Prop({ 
    type: Object, 
    default: {
      timezone: 'UTC',
      language: 'en',
      theme: 'light'
    }
  })
  profile: {
    avatar?: string;
    bio?: string;
    company?: string;
    website?: string;
    location?: string;
    timezone: string;
    language: string;
    theme: string;
  };

  @ApiProperty({ description: 'User permissions and access control' })
  @Prop({ 
    type: Object, 
    default: {
      canCreateApps: true,
      canManageUsers: false,
      canAccessAnalytics: false,
      canManageSystem: false,
      maxApps: 5,
      maxStorageGB: 10,
      maxFilesPerApp: 10000,
      allowedFileTypes: []
    }
  })
  permissions: {
    canCreateApps: boolean;
    canManageUsers: boolean;
    canAccessAnalytics: boolean;
    canManageSystem: boolean;
    maxApps: number;
    maxStorageGB: number;
    maxFilesPerApp: number;
    allowedFileTypes: string[];
  };

  @ApiProperty({ description: 'Two-factor authentication settings' })
  @Prop({ 
    type: Object, 
    default: {
      enabled: false,
      backupCodes: []
    }
  })
  twoFactorAuth: {
    enabled: boolean;
    secret?: string;
    backupCodes: string[];
    lastUsed?: Date;
  };

  @ApiProperty({ description: 'Login and security information' })
  @Prop({ 
    type: Object, 
    default: {
      loginCount: 0,
      failedLoginAttempts: 0,
      sessionTokens: []
    }
  })
  security: {
    lastLogin?: Date;
    lastLoginIp?: string;
    loginCount: number;
    failedLoginAttempts: number;
    lockedUntil?: Date;
    passwordChangedAt?: Date;
    sessionTokens: Array<{
      token: string;
      createdAt: Date;
      expiresAt: Date;
      userAgent?: string;
      ipAddress?: string;
    }>;
  };

  @ApiProperty({ description: 'Email verification' })
  @Prop({ 
    type: Object, 
    default: {
      isVerified: false
    }
  })
  emailVerification: {
    isVerified: boolean;
    verificationToken?: string;
    verificationTokenExpires?: Date;
    verifiedAt?: Date;
  };

  @ApiProperty({ description: 'Password reset information' })
  @Prop({ 
    type: Object, 
    default: {
      resetTokenUsed: false
    }
  })
  passwordReset: {
    resetToken?: string;
    resetTokenExpires?: Date;
    resetTokenUsed: boolean;
  };

  @ApiProperty({ description: 'User preferences and settings' })
  @Prop({ 
    type: Object, 
    default: {
      notifications: {
        email: true,
        push: true,
        fileUploaded: true,
        storageQuotaWarning: true,
        securityAlerts: true,
        weeklyReport: false
      },
      dashboard: {
        defaultView: 'grid',
        itemsPerPage: 20,
        showHiddenFiles: false,
        autoRefresh: true
      }
    }
  })
  preferences: {
    notifications: {
      email: boolean;
      push: boolean;
      fileUploaded: boolean;
      storageQuotaWarning: boolean;
      securityAlerts: boolean;
      weeklyReport: boolean;
    };
    dashboard: {
      defaultView: string;
      itemsPerPage: number;
      showHiddenFiles: boolean;
      autoRefresh: boolean;
    };
  };

  @ApiProperty({ description: 'User subscription and billing' })
  @Prop({ 
    type: Object, 
    default: {
      plan: 'free',
      cancelAtPeriodEnd: false
    }
  })
  subscription: {
    plan: string;
    subscriptionId?: string;
    subscriptionStatus?: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd: boolean;
    trialEndsAt?: Date;
  };

  @ApiProperty({ description: 'User activity tracking' })
  @Prop({ 
    type: Object, 
    default: {
      totalUploads: 0,
      totalDownloads: 0,
      storageUsed: 0,
      apiCallsCount: 0
    }
  })
  activity: {
    lastActivity?: Date;
    totalUploads: number;
    totalDownloads: number;
    storageUsed: number;
    apiCallsCount: number;
    lastApiCall?: Date;
  };

  @ApiProperty({ description: 'Terms and privacy acceptance' })
  @Prop({ 
    type: Object, 
    default: {
      marketingConsent: false
    }
  })
  legal: {
    termsAcceptedAt?: Date;
    privacyAcceptedAt?: Date;
    termsVersion?: string;
    privacyVersion?: string;
    marketingConsent: boolean;
  };

  @ApiProperty({ description: 'User notes (admin only)' })
  @Prop({ trim: true })
  adminNotes?: string;

  @ApiProperty({ description: 'Account creation source' })
  @Prop({ 
    type: String, 
    enum: ['registration', 'admin', 'import', 'oauth'], 
    default: 'registration' 
  })
  createdVia: string;

  @ApiProperty({ description: 'User who created this account (if admin created)' })
  @Prop()
  createdBy?: string;

  @ApiProperty({ description: 'Account deletion information' })
  @Prop({ 
    type: Object, 
    required: false
  })
  deletion?: {
    requestedAt: Date;
    reason?: string;
    scheduledFor: Date;
    completedAt?: Date;
  };

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes for better performance
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ 'emailVerification.isVerified': 1 });
UserSchema.index({ 'security.lastLogin': -1 });
UserSchema.index({ 'subscription.plan': 1 });
UserSchema.index({ createdAt: -1 });

// Text search index
UserSchema.index({ 
  fullName: 'text', 
  email: 'text', 
  'profile.company': 'text' 
});

// Compound indexes
UserSchema.index({ status: 1, role: 1 });
UserSchema.index({ 'emailVerification.isVerified': 1, status: 1 }); 