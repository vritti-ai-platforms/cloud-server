import fastifyCookie from '@fastify/cookie';
import fastifyCsrfProtection from '@fastify/csrf-protection';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  CorrelationIdMiddleware,
  configureApiSdk,
  HttpExceptionFilter,
  HttpLoggerInterceptor,
  LoggerService,
} from '@vritti/api-sdk';
import fastifyRawBody from 'fastify-raw-body';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

// ============================================================================
// Environment Configuration
// ============================================================================

const ENV = {
  nodeEnv: process.env.NODE_ENV,
  useHttps: process.env.USE_HTTPS === 'true',
  logProvider: process.env.LOG_PROVIDER || 'winston',
  port: process.env.PORT ?? 3000,
  host: 'local.vrittiai.com',
  // Cookie configuration
  refreshCookieName: process.env.REFRESH_COOKIE_NAME ?? 'vritti_refresh',
  refreshCookieDomain: process.env.REFRESH_COOKIE_DOMAIN,
} as const;

const protocol = ENV.useHttps ? 'https' : 'http';
const baseUrl = `${protocol}://${ENV.host}:${ENV.port}`;

// ============================================================================
// CORS Configuration
// ============================================================================

const CORS_ORIGINS = [
  'http://localhost:5173', // Host app
  'http://localhost:3001', // Auth MF
  'http://localhost:3012', // Host app main port
  'http://localhost:5174', // Other possible ports
  `http://${ENV.host}:3012`,
  `http://cloud.${ENV.host}:3012`,
  `https://${ENV.host}:3012`,
  `https://cloud.${ENV.host}:3012`,
];

const CORS_CONFIG = {
  origin: CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
};

// ============================================================================
// Configuration Functions
// ============================================================================

/**
 * Configure api-sdk BEFORE creating the NestJS app
 * This sets up cookie names, JWT settings, and auth guard config
 */
function configureApiSdkSettings() {
  configureApiSdk({
    cookie: {
      refreshCookieName: ENV.refreshCookieName,
      refreshCookieSecure: ENV.nodeEnv === 'production',
      refreshCookieMaxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      refreshCookieSameSite: 'strict',
      refreshCookieDomain: ENV.refreshCookieDomain,
    },
    guard: {
      tenantHeaderName: 'x-tenant-id',
    },
  });
}

/**
 * Create Swagger/OpenAPI configuration
 */
function createSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('Vritti Cloud API')
    .setDescription('Internal API for Vritti SaaS Platform')
    .setVersion('1.0.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Enter your JWT access token',
    })
    .addServer(baseUrl, 'Local Development')
    .addTag('Health', 'Health check endpoints')
    .addTag('CSRF', 'CSRF token management')
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Auth - OAuth', 'OAuth authentication flows')
    .addTag('Auth - Passkey', 'Passkey/WebAuthn authentication')
    .addTag('MFA', 'Multi-factor authentication verification')
    .addTag('Onboarding', 'User onboarding flow')
    .addTag('Onboarding - Two-Factor Authentication', '2FA setup during onboarding')
    .addTag('Onboarding - Verification Events', 'SSE events for verification status')
    .addTag('Onboarding - Webhooks', 'Webhook handlers for SMS/WhatsApp')
    .addTag('Tenants', 'Tenant management')
    .addTag('Users', 'User management')
    .build();
}

// ============================================================================
// Bootstrap Function
// ============================================================================

async function bootstrap() {
  // Configure API SDK settings
  configureApiSdkSettings();

  // Determine logger configuration
  // When using default provider, let NestJS use its built-in logger to avoid circular reference
  // When using Winston, we need to use LoggerService
  const useBuiltInLogger = ENV.logProvider === 'default';
  const loggerOptions = useBuiltInLogger
    ? {}
    : {
        logger: new LoggerService({
          environment: ENV.nodeEnv,
        }),
      };

  // Configure Fastify adapter with HTTPS support when enabled
  const fastifyAdapter = new FastifyAdapter(
    ENV.useHttps
      ? {
          https: {
            key: readFileSync('./certs/local.vrittiai.com+4-key.pem'),
            cert: readFileSync('./certs/local.vrittiai.com+4.pem'),
          },
        }
      : {},
  );

  // Create NestJS application
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, fastifyAdapter, loggerOptions);

  // Get services from DI container
  const configService = app.get(ConfigService);

  // Only replace logger when using Winston provider
  // Default provider would create circular reference if we call app.useLogger()
  if (!useBuiltInLogger) {
    const appLogger = app.get(LoggerService);
    app.useLogger(appLogger);
  }

  // Register cookie support
  await app.register(fastifyCookie, {
    secret: configService.getOrThrow<string>('COOKIE_SECRET'),
  });

  // Register raw body plugin for webhook signature validation
  // global: true ensures rawBody is available for all routes (needed for webhooks)
  await app.register(fastifyRawBody, {
    field: 'rawBody',
    global: true,
    encoding: 'utf8',
    runFirst: true, // Run before other hooks
  });

  // Register CSRF protection
  await app.register(fastifyCsrfProtection, {
    cookieOpts: {
      signed: true,
      httpOnly: true,
      sameSite: 'lax', // IMPORTANT: 'strict' breaks OAuth redirects
      secure: ENV.nodeEnv === 'production',
      path: '/', // Cookie must be available for all endpoints
    },
    csrfOpts: {
      hmacKey: configService.getOrThrow<string>('CSRF_HMAC_KEY'),
    },
  });

  // Register global exception filter for RFC 7807 Problem Details format
  // This filter transforms all exceptions (custom, NestJS built-in, DTO validation)
  // into a consistent format with errors array: { errors: [{ field?, message }] }
  app.useGlobalFilters(new HttpExceptionFilter());

  // Register correlation ID middleware for request tracking using Fastify hooks
  // Using addHook ensures AsyncLocalStorage context persists throughout request lifecycle
  const correlationMiddleware = app.get(CorrelationIdMiddleware);
  const fastifyInstance = app.getHttpAdapter().getInstance();
  fastifyInstance.addHook('onRequest', async (request, reply) => {
    await correlationMiddleware.onRequest(request, reply);
  });

  // Register HTTP logger interceptor for request/response logging
  const httpLoggerInterceptor = app.get(HttpLoggerInterceptor);
  app.useGlobalInterceptors(httpLoggerInterceptor);

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      // Preserve ValidationError objects with property and constraints fields
      // This ensures HttpExceptionFilter can extract field names from DTO validation errors
      exceptionFactory: (errors) => {
        return new BadRequestException(errors);
      },
    }),
  );

  // Enable CORS for frontend applications
  app.enableCors(CORS_CONFIG);

  // Configure Swagger/OpenAPI documentation
  const swaggerConfig = createSwaggerConfig();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Export OpenAPI spec to file for Mintlify docs
  const openApiPath = join(process.cwd(), 'openapi.json');
  writeFileSync(openApiPath, JSON.stringify(document, null, 2));

  // Setup Swagger UI at /api/docs
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Start the server
  await app.listen(ENV.port, '0.0.0.0');

  // Get logger from DI container for final bootstrap message
  const logger = app.get(LoggerService);
  logger.log(`API Nexus running on ${baseUrl}`, 'Bootstrap');
}

bootstrap();
