import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User, UserSchema } from '../../schemas/user.schema';
import { App, AppSchema } from '../../schemas/app.schema';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { ApiKeyStrategy } from './strategies/api-key.strategy';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    
    // JWT Module
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('auth.jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('auth.jwt.expiresIn', '15m'),
          issuer: configService.get<string>('auth.jwt.issuer', 'digital-bucket'),
        },
      }),
      inject: [ConfigService],
    }),

    // Database Models
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: App.name, schema: AppSchema },
    ]),
  ],
  
  controllers: [AuthController],
  
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    ApiKeyStrategy,
  ],
  
  exports: [
    AuthService,
    JwtModule,
    PassportModule,
  ],
})
export class AuthModule {} 