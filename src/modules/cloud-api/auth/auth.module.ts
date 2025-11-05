import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { JwtAuthService } from './services/jwt.service';
import { SessionService } from './services/session.service';
import { SessionRepository } from './repositories/session.repository';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AccountStatusGuard } from './guards/account-status.guard';
import { UserModule } from '../user/user.module';
import { CommonModule } from '../common/common.module';
import { jwtConfigFactory } from '../../../config/jwt.config';

/**
 * Auth Module
 * Handles user authentication, session management, and JWT tokens
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: jwtConfigFactory,
    }),
    UserModule,
    CommonModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthService,
    SessionService,
    SessionRepository,
    JwtStrategy,
    JwtAuthGuard,
    AccountStatusGuard,
  ],
  exports: [
    AuthService,
    JwtAuthService,
    SessionService,
    JwtAuthGuard,
    AccountStatusGuard,
  ],
})
export class AuthModule {}
