import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AdminGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First check if user is authenticated
    const isAuthenticated = await super.canActivate(context);
    if (!isAuthenticated) {
      throw new UnauthorizedException('Authentication required');
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if user has admin role
    if (user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    // Check if user account is active
    if (user.status !== 'active') {
      throw new ForbiddenException('Account is not active');
    }

    // Check specific admin permissions if needed
    const requiredPermission = this.reflector.get<string>(
      'permission',
      context.getHandler(),
    );

    if (requiredPermission && !this.hasPermission(user, requiredPermission)) {
      throw new ForbiddenException(
        `Insufficient permissions: ${requiredPermission} required`,
      );
    }

    return true;
  }

  private hasPermission(user: any, permission: string): boolean {
    // Check specific admin permissions
    switch (permission) {
      case 'manage_users':
        return user.permissions?.canManageUsers === true;
      case 'manage_system':
        return user.permissions?.canManageSystem === true;
      case 'access_analytics':
        return user.permissions?.canAccessAnalytics === true;
      default:
        return true; // Default admin permissions
    }
  }
}

// Decorator for requiring specific permissions
export const RequirePermission = (permission: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('permission', permission, descriptor.value);
    return descriptor;
  };
}; 