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
    avatar: { type: String },
    bio: { type: String, maxlength: 500 },
    company: { type: String },
    website: { type: String },
    location: { type: String },
    timezone: { type: String, default: 'UTC' },
    language: { type: String, default: 'en' },
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'light' },
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
    canCreateApps: { type: Boolean, default: true },
    canManageUsers: { type: Boolean, default: false },
    canAccessAnalytics: { type: Boolean, default: false },
    canManageSystem: { type: Boolean, default: false },
    maxApps: { type: Number, default: 5 },
    maxStorageGB: { type: Number, default: 10 },
    maxFilesPerApp: { type: Number, default: 10000 },
    allowedFileTypes: [{ type: String }],
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
    enabled: { type: Boolean, default: false },
    secret: { type: String },
    backupCodes: [{ type: String }],
    lastUsed: { type: Date },
  })
  twoFactorAuth: {
    enabled: boolean;
    secret?: string;
    backupCodes: string[];
    lastUsed?: Date;
  };

  @ApiProperty({ description: 'Login and security information' })
  @Prop({
    lastLogin: { type: Date },
    lastLoginIp: { type: String },
    loginCount: { type: Number, default: 0 },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    passwordChangedAt: { type: Date },
    sessionTokens: [{ 
      token: { type: String },
      createdAt: { type: Date, default: Date.now },
      expiresAt: { type: Date },
      userAgent: { type: String },
      ipAddress: { type: String },
    }],
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
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    verificationTokenExpires: { type: Date },
    verifiedAt: { type: Date },
  })
  emailVerification: {
    isVerified: boolean;
    verificationToken?: string;
    verificationTokenExpires?: Date;
    verifiedAt?: Date;
  };

  @ApiProperty({ description: 'Password reset information' })
  @Prop({
    resetToken: { type: String },
    resetTokenExpires: { type: Date },
    resetTokenUsed: { type: Boolean, default: false },
  })
  passwordReset: {
    resetToken?: string;
    resetTokenExpires?: Date;
    resetTokenUsed: boolean;
  };

  @ApiProperty({ description: 'User preferences and settings' })
  @Prop({
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      fileUploaded: { type: Boolean, default: true },
      storageQuotaWarning: { type: Boolean, default: true },
      securityAlerts: { type: Boolean, default: true },
      weeklyReport: { type: Boolean, default: false },
    },
    dashboard: {
      defaultView: { type: String, enum: ['grid', 'list'], default: 'grid' },
      itemsPerPage: { type: Number, default: 20 },
      showHiddenFiles: { type: Boolean, default: false },
      autoRefresh: { type: Boolean, default: true },
    },
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
    plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
    subscriptionId: { type: String },
    subscriptionStatus: { type: String },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    trialEndsAt: { type: Date },
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
    lastActivity: { type: Date },
    totalUploads: { type: Number, default: 0 },
    totalDownloads: { type: Number, default: 0 },
    storageUsed: { type: Number, default: 0 },
    apiCallsCount: { type: Number, default: 0 },
    lastApiCall: { type: Date },
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
    termsAcceptedAt: { type: Date },
    privacyAcceptedAt: { type: Date },
    termsVersion: { type: String },
    privacyVersion: { type: String },
    marketingConsent: { type: Boolean, default: false },
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
    requestedAt: { type: Date },
    reason: { type: String },
    scheduledFor: { type: Date },
    completedAt: { type: Date },
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