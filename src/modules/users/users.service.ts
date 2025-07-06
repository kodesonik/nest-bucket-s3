import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async findAll(query: any = {}): Promise<UserDocument[]> {
    return this.userModel.find(query).exec();
  }

  async getUsers(query: any = {}): Promise<{
    users: UserDocument[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const users = await this.userModel
      .find(query.filters || {})
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.userModel.countDocuments(query.filters || {});
    const pages = Math.ceil(total / limit);

    return {
      users,
      total,
      page,
      limit,
      pages,
    };
  }

  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    verified: number;
    unverified: number;
  }> {
    const total = await this.userModel.countDocuments();
    const active = await this.userModel.countDocuments({ status: 'active' });
    const inactive = await this.userModel.countDocuments({ status: { $ne: 'active' } });
    const verified = await this.userModel.countDocuments({ isEmailVerified: true });
    const unverified = await this.userModel.countDocuments({ isEmailVerified: false });

    return {
      total,
      active,
      inactive,
      verified,
      unverified,
    };
  }

  async findById(id: string): Promise<UserDocument> {
    return this.userModel.findById(id).exec();
  }

  async create(userData: any): Promise<UserDocument> {
    const user = new this.userModel(userData);
    return user.save();
  }

  async update(id: string, userData: any): Promise<UserDocument> {
    return this.userModel.findByIdAndUpdate(id, userData, { new: true }).exec();
  }

  async delete(id: string): Promise<void> {
    await this.userModel.findByIdAndDelete(id).exec();
  }

  async activateUser(id: string, adminId: string): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(
      id,
      { status: 'active' },
      { new: true }
    ).exec();
    return user;
  }

  async resetUserPassword(id: string, adminId: string): Promise<{ message: string }> {
    const tempPassword = Math.random().toString(36).slice(-8);
    await this.userModel.findByIdAndUpdate(id, { 
      password: tempPassword,
      passwordResetRequired: true 
    }).exec();
    return { message: 'Password reset successfully' };
  }

  async getUserSessions(id: string): Promise<any[]> {
    // Placeholder implementation
    return [];
  }

  async terminateSession(userId: string, sessionId: string): Promise<{ message: string }> {
    // Placeholder implementation
    return { message: 'Session terminated successfully' };
  }

  async suspendUser(id: string, reason: string, adminId: string): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(
      id,
      { status: 'suspended', suspensionReason: reason },
      { new: true }
    ).exec();
    return user;
  }
} 