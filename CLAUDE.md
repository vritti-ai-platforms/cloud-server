# vritti-api-nexus - Development Best Practices

This document outlines the conventions and best practices for the vritti-api-nexus backend application.

## Project Overview

vritti-api-nexus is the main backend API built with:
- **NestJS** framework with TypeScript
- **Fastify** adapter (faster than Express)
- **@vritti/api-sdk** shared module library
- **Prisma** for database ORM
- **PostgreSQL** for data persistence
- **Multi-tenant** architecture with tenant isolation
- **JWT** authentication with refresh tokens
- **Swagger/OpenAPI** documentation

### Main Features
- Authentication (login, signup, OAuth, passkey)
- Multi-factor authentication (MFA)
- User onboarding flow
- Tenant management
- CSRF protection
- Correlation ID tracking
- RFC 7807 error responses

## Critical Best Practices

### 1. Configuration Extraction

**CRITICAL: Extract environment variables and configuration into constants.**

This improves:
- **Maintainability**: Changes are centralized
- **Testability**: Easy to mock configuration
- **Readability**: Clear configuration structure
- **Type safety**: Explicit types with `as const`

**Pattern**: Extract to `ENV` constant (`src/main.ts`):
```typescript
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
```

**DO**:
- ✅ Group related environment variables in `ENV` constant
- ✅ Provide sensible defaults with `??` operator
- ✅ Use `as const` for readonly configuration (except when type conflicts)
- ✅ Calculate derived values (protocol, baseUrl) at top level
- ✅ Add section divider comments for clarity

**DON'T**:
- ❌ Access `process.env` directly throughout the code
- ❌ Repeat default values in multiple places
- ❌ Mix configuration logic with business logic
- ❌ Forget to validate required environment variables

### 2. CORS Configuration Separation

**Extract CORS configuration for clarity and reusability.**

```typescript
// ============================================================================
// CORS Configuration
// ============================================================================

const CORS_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3001',
  'http://localhost:3012',
  `http://${ENV.host}:3012`,
  `https://${ENV.host}:3012`,
];

const CORS_CONFIG = {
  origin: CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
};

// Later in bootstrap function
app.enableCors(CORS_CONFIG);
```

### 3. Configuration Functions

**Extract reusable configuration logic into functions.**

Benefits:
- Simplifies bootstrap function
- Makes configuration testable
- Improves code organization
- Enables reuse across environments

**Example** (`src/main.ts`):
```typescript
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
    jwt: {
      validateTokenBinding: true,
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
    .addTag('Auth', 'Authentication endpoints')
    .build();
}

// Later in bootstrap function
async function bootstrap() {
  // Configure API SDK settings
  configureApiSdkSettings();

  // ... create app ...

  // Configure Swagger/OpenAPI documentation
  const swaggerConfig = createSwaggerConfig();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
}
```

### 4. Code Organization

**Use clear section dividers and logical grouping.**

Structure of `src/main.ts`:
```typescript
// ============================================================================
// Environment Configuration
// ============================================================================
const ENV = { /* ... */ };
const protocol = /* ... */;
const baseUrl = /* ... */;

// ============================================================================
// CORS Configuration
// ============================================================================
const CORS_ORIGINS = [ /* ... */ ];
const CORS_CONFIG = { /* ... */ };

// ============================================================================
// Configuration Functions
// ============================================================================
function configureApiSdkSettings() { /* ... */ }
function createSwaggerConfig() { /* ... */ }

// ============================================================================
// Bootstrap Function
// ============================================================================
async function bootstrap() {
  // 1. Configure API SDK settings
  configureApiSdkSettings();

  // 2. Determine logger configuration
  const loggerOptions = /* ... */;

  // 3. Configure Fastify adapter
  const fastifyAdapter = /* ... */;

  // 4. Create NestJS application
  const app = await NestFactory.create(/* ... */);

  // 5. Register middleware and plugins
  await app.register(/* ... */);

  // 6. Start the server
  await app.listen(ENV.port, '0.0.0.0');
}
```

**Benefits**:
- Clear visual separation of concerns
- Easy to navigate large files
- Consistent structure across projects
- Simplified bootstrap function

### 5. Environment Variables

**Access via ConfigService for validation and type safety.**

```typescript
// In modules/controllers/services
constructor(private configService: ConfigService) {}

// Use getOrThrow for required variables (throws if missing)
const cookieSecret = this.configService.getOrThrow<string>('COOKIE_SECRET');

// Use get for optional variables with defaults
const port = this.configService.get<number>('PORT', 3000);
```

**Required environment variables**:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - JWT refresh token secret
- `COOKIE_SECRET` - Cookie signing secret
- `CSRF_HMAC_KEY` - CSRF token HMAC key

**Optional environment variables**:
- `NODE_ENV` - Environment (development/production)
- `USE_HTTPS` - Enable HTTPS (true/false)
- `PORT` - Server port (default: 3000)
- `LOG_PROVIDER` - Logger provider (winston/default)

## Starting the Application

**Prerequisites**:
1. **PostgreSQL database running**:
   ```bash
   # Using Docker Compose
   docker-compose up -d postgres
   ```

2. **Environment variables configured** in `.env`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/vritti"
   JWT_SECRET="your-jwt-secret"
   JWT_REFRESH_SECRET="your-refresh-secret"
   COOKIE_SECRET="your-cookie-secret"
   CSRF_HMAC_KEY="your-csrf-key"
   ```

3. **Database migrations applied**:
   ```bash
   pnpm prisma migrate dev
   ```

4. **SSL certificates** (if using HTTPS):
   - Place certificates in `./certs/` directory
   - Files: `local.vrittiai.com+4-key.pem` and `local.vrittiai.com+4.pem`

**Available npm scripts**:
```bash
# Development mode (HTTP by default)
pnpm dev                      # Starts on http://local.vrittiai.com:3000

# Development mode (HTTPS)
USE_HTTPS=true pnpm dev       # Starts on https://local.vrittiai.com:3000

# Production build
pnpm build
pnpm start:prod
```

**Access URLs**:
- **HTTP**: `http://local.vrittiai.com:3000`
- **HTTPS**: `https://local.vrittiai.com:3000`
- **Swagger docs**: `{protocol}://local.vrittiai.com:3000/api/docs`
- **Health check**: `{protocol}://local.vrittiai.com:3000/health`

**Important Notes**:
- Protocol (HTTP/HTTPS) is determined by `USE_HTTPS` environment variable
- Swagger UI persists authorization tokens in browser
- CORS is configured for local frontend ports (3001, 3012, 5173)
- OpenAPI spec is exported to `openapi.json` on startup

## Module Structure

### Feature Modules
```
src/
├── modules/
│   ├── auth/           # Authentication (login, signup, OAuth)
│   ├── mfa/            # Multi-factor authentication
│   ├── onboarding/     # User onboarding flow
│   ├── tenants/        # Tenant management
│   ├── users/          # User management
│   ├── health/         # Health check
│   └── csrf/           # CSRF token management
```

### Shared Services
- **@vritti/api-sdk** - Shared module library
  - `LoggerService` - Structured logging
  - `HttpExceptionFilter` - RFC 7807 error format
  - `HttpLoggerInterceptor` - Request/response logging
  - `CorrelationIdMiddleware` - Request tracking
  - JWT guards and decorators
  - Cookie management utilities

### Database Patterns
- **Primary database**: Team-level data (via `@vritti/api-sdk`)
- **Tenant database**: Tenant-isolated data (via custom service)
- **Prisma schema**: Multi-tenant with tenant ID foreign keys
- **Migrations**: Handled by Prisma CLI

## Common Patterns

### Controller Example
```typescript
@Controller('users')
@ApiTags('Users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async findAll() {
    return this.usersService.findAll();
  }
}
```

### Service Example
```typescript
@Injectable()
export class UsersService {
  constructor(
    private primaryDb: PrimaryDatabaseService,
    private tenantDb: TenantDatabaseService,
  ) {}

  async findAll() {
    return this.primaryDb.user.findMany();
  }
}
```

### Error Handling

The project uses RFC 7807 Problem Details format for all error responses. All exceptions are automatically transformed by `HttpExceptionFilter` from `@vritti/api-sdk`.

#### Error Response Format
```json
{
  "title": "Bad Request",
  "status": 400,
  "detail": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email format" },
    { "message": "General error without specific field" }
  ]
}
```

#### Exception Constructor Patterns

**CRITICAL: Choose the correct pattern based on whether the error is field-specific or general.**

```typescript
import { BadRequestException, UnauthorizedException, NotFoundException } from '@vritti/api-sdk';

// Pattern 1: General error (no field) - USE FOR AUTH FAILURES, SESSION ERRORS, etc.
// Frontend displays as root form error
throw new UnauthorizedException('Your session has expired. Please log in again.');
// Response: { errors: [{ message: "Your session has expired..." }] }

// Pattern 2: Field-specific error - USE ONLY when error relates to a FORM FIELD
throw new BadRequestException('email', 'Invalid email format');
// Response: { errors: [{ field: "email", message: "Invalid email format" }] }

// Pattern 3: Field + detail
throw new BadRequestException('email', 'Email already exists', 'Please use a different email or login.');
// Response: { errors: [{ field: "email", message: "Email already exists" }], detail: "Please use..." }

// Pattern 4: Array of errors
throw new BadRequestException([
  { field: 'email', message: 'Invalid email' },
  { field: 'password', message: 'Password too weak' }
]);

// Pattern 5: Array + detail
throw new BadRequestException(
  [{ field: 'code', message: 'Invalid verification code' }],
  'Please check your authenticator app and try again.'
);
```

#### Common Mistakes to AVOID

```typescript
// WRONG - "Invalid credentials" is NOT a form field name!
// This error won't display because no form field matches "Invalid credentials"
throw new UnauthorizedException(
  'Invalid credentials',  // <-- This becomes field name
  'The email or password is incorrect.',
);

// CORRECT - Use message-only pattern for general auth errors
throw new UnauthorizedException(
  'The email or password you entered is incorrect. Please check your credentials and try again.',
);

// WRONG - "Session expired" is NOT a form field
throw new UnauthorizedException('Session expired', 'Please log in again.');

// CORRECT
throw new UnauthorizedException('Your session has expired. Please log in again.');
```

#### When to Use Each Pattern

| Scenario | Pattern | Example |
|----------|---------|---------|
| Login failure (wrong password) | Message only | `throw new UnauthorizedException('Invalid email or password.')` |
| Session expired | Message only | `throw new UnauthorizedException('Session expired. Please log in again.')` |
| Invalid form field | Field + message | `throw new BadRequestException('email', 'Invalid email format')` |
| DTO validation (auto) | Field + message | Handled by ValidationPipe automatically |
| Resource not found | Message only | `throw new NotFoundException('User not found.')` |
| Account status issue | Message only | `throw new UnauthorizedException('Account is suspended.')` |
| OTP/Code verification | Field + message | `throw new BadRequestException('code', 'Invalid verification code')` |

#### Frontend Integration

The frontend `mapApiErrorsToForm` function:
1. If `errors[].field` matches a form field → displays inline on that field
2. If `errors[].field` doesn't match any field → error is LOST (bug!)
3. If `errors[]` has no `field` → displays as root form error (if `showRootError={true}`)

**Always ensure your `field` value matches an actual form field name, or omit it entirely.**
