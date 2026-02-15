import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import * as schema from '@/db/schema';
import { relations } from '@/db/schema';

import './db/schema.registry';

import { RouterModule } from '@nestjs/core';
import { AuthConfigModule, DatabaseModule, type DatabaseModuleOptions, LoggerModule } from '@vritti/api-sdk';
import { validate } from './config/env.validation';
import { AppController } from './modules/root/controllers/app.controller';
import { CsrfController } from './modules/root/controllers/csrf.controller';
import { AppService } from './modules/root/services/app.service';
import { RmqModule } from './rmq';
import { AuthModule } from './modules/cloud-api/auth/auth.module';
import { ChatModule } from './modules/cloud-api/chat/chat.module';
import { WebhookModule } from './modules/cloud-api/chat/webhooks/webhook.module';
import { OnboardingModule } from './modules/cloud-api/onboarding/onboarding.module';
import { TenantModule } from './modules/cloud-api/tenant/tenant.module';
import { UserModule } from './modules/cloud-api/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
    }),
    // Event emitter for real-time WebSocket updates
    EventEmitterModule.forRoot(),
    // Logger module configuration with environment presets
    // Presets available: 'development', 'staging', 'production', 'test'
    // All preset values can be overridden with explicit options
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return {
          // Explicit environment selection (required for preset system)
          environment: configService.get('NODE_ENV', 'development'),

          // Application metadata
          appName: configService.get('APP_NAME', 'vritti-api-nexus'),

          // Optional overrides (if not set, preset values are used)
          provider: configService.get('LOG_PROVIDER'),
          level: configService.get('LOG_LEVEL'),
          format: configService.get('LOG_FORMAT'),
          enableFileLogger: configService.get('LOG_TO_FILE'),
          filePath: configService.get('LOG_FILE_PATH'),
          maxFiles: configService.get('LOG_MAX_FILES'),

          // // HTTP logging configuration (optional)
          enableHttpLogger: true,
          httpLogger: {
            enableRequestLog: true,
            enableResponseLog: true,
            slowRequestThreshold: 3000, // milliseconds
          },
        };
      },
      inject: [ConfigService],
    }),
    // Multi-tenant database module (Gateway Mode)
    // forServer() automatically registers TenantContextInterceptor and imports RequestModule
    DatabaseModule.forServer({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const options: DatabaseModuleOptions = {
          // Primary database configuration for tenant registry
          primaryDb: {
            host: config.getOrThrow<string>('PRIMARY_DB_HOST'),
            port: config.get<number>('PRIMARY_DB_PORT'),
            username: config.getOrThrow<string>('PRIMARY_DB_USERNAME'),
            password: config.getOrThrow<string>('PRIMARY_DB_PASSWORD'),
            database: config.getOrThrow<string>('PRIMARY_DB_DATABASE'),
            schema: config.get<string>('PRIMARY_DB_SCHEMA'),
            sslMode: config.get<'require' | 'prefer' | 'disable' | 'no-verify'>('PRIMARY_DB_SSL_MODE'),
          },

          drizzleSchema: schema,
          // Relations must be passed separately for db.query to work (drizzle-orm v2)
          drizzleRelations: relations,

          // Connection pool configuration
          connectionCacheTTL: 300000, // 5 minutes
          maxConnections: 10,
        };
        return options;
      },
    }),
    // Authentication module (Global guard + JWT)
    // Must be imported after DatabaseModule since VrittiAuthGuard depends on its services
    AuthConfigModule.forRootAsync(),
    // RabbitMQ client for inter-service communication (only when RABBITMQ_URL is configured)
    ...(process.env.RABBITMQ_URL ? [RmqModule] : []),
    // Cloud API modules
    TenantModule,
    UserModule,
    OnboardingModule,
    AuthModule,
    ChatModule,
    // Webhook module registered outside RouterModule so it stays at /webhooks/* (not /cloud-api/webhooks/*)
    WebhookModule,
    // Cloud API routes with 'cloud-api' prefix
    RouterModule.register([
      {
        path: 'cloud-api',
        children: [TenantModule, UserModule, OnboardingModule, AuthModule, ChatModule],
      },
    ]),
  ],
  controllers: [AppController, CsrfController],
  providers: [AppService],
})
export class AppModule {}
