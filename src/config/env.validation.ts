import { plainToInstance, Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsEnum, IsNumber, IsString, Max, Min, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Staging = 'staging',
}

class EnvironmentVariables {
  // Application
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  @Min(1)
  @Max(65535)
  PORT: number;

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  USE_HTTPS: boolean;

  // Security
  @IsString()
  COOKIE_SECRET: string;

  @IsString()
  HMAC_KEY: string;

  // JWT
  @IsString()
  JWT_SECRET: string;

  @IsString()
  ACCESS_TOKEN_EXPIRY: string;

  @IsString()
  REFRESH_TOKEN_EXPIRY: string;

  // Frontend
  @IsString()
  FRONTEND_BASE_URL: string;

  // Logging
  @IsString()
  APP_NAME: string;

  @IsEnum(['default', 'winston'])
  LOG_PROVIDER: string;

  @IsString()
  LOG_LEVEL: string;

  @IsString()
  LOG_FORMAT: string;

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  LOG_TO_FILE: boolean;

  @IsString()
  LOG_FILE_PATH: string;

  @IsString()
  LOG_MAX_FILES: string;

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  MASK_PII: boolean;

  // Primary Database
  @IsString()
  PRIMARY_DB_HOST: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  PRIMARY_DB_PORT: number;

  @IsString()
  PRIMARY_DB_USERNAME: string;

  @IsString()
  PRIMARY_DB_PASSWORD: string;

  @IsString()
  PRIMARY_DB_DATABASE: string;

  @IsString()
  PRIMARY_DB_SCHEMA: string;

  @IsEnum(['require', 'prefer', 'disable', 'no-verify'])
  PRIMARY_DB_SSL_MODE: 'require' | 'prefer' | 'disable' | 'no-verify';

  @IsString()
  ENCRYPTION_KEY: string;

  // Email
  @IsString()
  BREVO_API_KEY: string;

  @IsEmail()
  SENDER_EMAIL: string;

  @IsString()
  SENDER_NAME: string;

  // Cookie / Session
  @IsString()
  REFRESH_COOKIE_NAME: string;

  @IsString()
  REFRESH_COOKIE_DOMAIN: string;

  @IsNumber()
  @Min(1)
  REFRESH_TOKEN_ROTATION_DAYS: number;

  // OTP / Verification
  @IsString()
  OTP_EXPIRY: string;

  @IsNumber()
  @Min(1)
  OTP_MAX_ATTEMPTS: number;

  @IsNumber()
  @Min(1)
  MFA_CHALLENGE_TTL_MINUTES: number;

  // Security — Hashing
  @IsNumber()
  @Min(10)
  BCRYPT_SALT_ROUNDS: number;

  // WhatsApp
  @IsString()
  WHATSAPP_PHONE_NUMBER_ID: string;

  @IsString()
  WHATSAPP_ACCESS_TOKEN: string;

  @IsString()
  WHATSAPP_VERIFY_TOKEN: string;

  @IsString()
  WHATSAPP_BUSINESS_NUMBER: string;

  @IsString()
  WHATSAPP_API_VERSION: string;

  // SMS
  @IsString()
  SMS_BUSINESS_NUMBER: string;

  @IsString()
  SMS_VERIFY_TOKEN: string;

  @IsString()
  SMS_WEBHOOK_SECRET: string;

  // Cloudflare R2 (S3-compatible storage)
  @IsString()
  R2_ACCOUNT_ID: string;

  @IsString()
  R2_ACCESS_KEY_ID: string;

  @IsString()
  R2_SECRET_ACCESS_KEY: string;

  @IsString()
  R2_BUCKET_NAME: string;

  // Media upload
  @IsNumber()
  @Min(1)
  MEDIA_MAX_FILE_SIZE_MB: number;

  @IsNumber()
  @Min(1)
  MEDIA_MAX_BATCH_SIZE: number;

  @IsNumber()
  @Min(1)
  MEDIA_SIGNED_URL_EXPIRY: number;

  @IsString()
  MEDIA_STORAGE_PROVIDER: string;

  // OAuth — Google
  @IsString()
  GOOGLE_CLIENT_ID: string;

  @IsString()
  GOOGLE_CLIENT_SECRET: string;

  @IsString()
  GOOGLE_CALLBACK_URL: string;

  // OAuth — Facebook (Meta)
  @IsString()
  META_CLIENT_ID: string;

  @IsString()
  META_CLIENT_SECRET: string;

  @IsString()
  FACEBOOK_CALLBACK_URL: string;

  // OAuth — Microsoft
  @IsString()
  MICROSOFT_CLIENT_ID: string;

  @IsString()
  MICROSOFT_CLIENT_SECRET: string;

  @IsString()
  MICROSOFT_CALLBACK_URL: string;

  // OAuth — X (Twitter)
  @IsString()
  X_CLIENT_ID: string;

  @IsString()
  X_CLIENT_SECRET: string;

  @IsString()
  X_CALLBACK_URL: string;

  // OAuth — Apple
  @IsString()
  APPLE_CLIENT_ID: string;

  @IsString()
  APPLE_TEAM_ID: string;

  @IsString()
  APPLE_KEY_ID: string;

  @IsString()
  APPLE_PRIVATE_KEY: string;

  @IsString()
  APPLE_CALLBACK_URL: string;
}

// Validates environment variables at application startup
export function validate(config: Record<string, unknown>): Record<string, unknown> {
  const processedConfig = {
    ...config,
    PORT: config.PORT ? parseInt(config.PORT as string, 10) : undefined,
    PRIMARY_DB_PORT: config.PRIMARY_DB_PORT ? parseInt(config.PRIMARY_DB_PORT as string, 10) : undefined,
    REFRESH_TOKEN_ROTATION_DAYS: config.REFRESH_TOKEN_ROTATION_DAYS
      ? parseInt(config.REFRESH_TOKEN_ROTATION_DAYS as string, 10)
      : undefined,
    OTP_MAX_ATTEMPTS: config.OTP_MAX_ATTEMPTS ? parseInt(config.OTP_MAX_ATTEMPTS as string, 10) : undefined,
    MFA_CHALLENGE_TTL_MINUTES: config.MFA_CHALLENGE_TTL_MINUTES
      ? parseInt(config.MFA_CHALLENGE_TTL_MINUTES as string, 10)
      : undefined,
    BCRYPT_SALT_ROUNDS: config.BCRYPT_SALT_ROUNDS ? parseInt(config.BCRYPT_SALT_ROUNDS as string, 10) : undefined,
    MEDIA_MAX_FILE_SIZE_MB: config.MEDIA_MAX_FILE_SIZE_MB
      ? parseInt(config.MEDIA_MAX_FILE_SIZE_MB as string, 10)
      : undefined,
    MEDIA_MAX_BATCH_SIZE: config.MEDIA_MAX_BATCH_SIZE
      ? parseInt(config.MEDIA_MAX_BATCH_SIZE as string, 10)
      : undefined,
    MEDIA_SIGNED_URL_EXPIRY: config.MEDIA_SIGNED_URL_EXPIRY
      ? parseInt(config.MEDIA_SIGNED_URL_EXPIRY as string, 10)
      : undefined,
  };

  const validatedConfig = plainToInstance(EnvironmentVariables, processedConfig, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => {
        const constraints = error.constraints ? Object.values(error.constraints).join(', ') : 'Unknown error';
        return `  - ${error.property}: ${constraints}`;
      })
      .join('\n');

    throw new Error(
      `❌ Environment validation failed:\n\n${errorMessages}\n\nPlease check your .env file and ensure all required variables are set correctly.`,
    );
  }

  return processedConfig;
}
