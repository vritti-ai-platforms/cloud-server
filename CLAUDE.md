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
  - `HttpExceptionFilter` - RFC 9457 error format
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

### Swagger Documentation Pattern (docs/ folders)

**CRITICAL: Swagger decorators live in separate `docs/` files, NOT inline on controllers.**

Controllers should be clean — business logic only. All `@ApiOperation`, `@ApiBody`, `@ApiResponse`, `@ApiParam`, `@ApiQuery`, `@ApiHeader`, `@ApiProduces` decorators are composed into single custom decorators using `applyDecorators` and stored in `docs/` folders.

**Structure:**
```
modules/cloud-api/
├── auth/
│   ├── controllers/
│   │   └── auth.controller.ts          ← clean logic, uses @ApiSignup()
│   ├── docs/
│   │   └── auth.docs.ts                ← Swagger decorators composed here
│   └── mfa-verification/
│       ├── mfa-verification.controller.ts
│       └── mfa-verification.docs.ts    ← co-located (submodule)
├── onboarding/
│   ├── controllers/
│   └── docs/
├── user/
│   ├── controllers/
│   └── docs/
└── tenant/
    ├── tenant.controller.ts
    └── docs/
```

**docs file pattern** (`auth.docs.ts`):
```typescript
import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SignupDto } from '../dto/signup.dto';

export function ApiSignup() {
  return applyDecorators(
    ApiOperation({ summary: 'User signup', description: '...' }),
    ApiBody({ type: SignupDto }),
    ApiResponse({ status: 200, description: '...' }),
    ApiResponse({ status: 400, description: '...' }),
    ApiResponse({ status: 409, description: '...' }),
  );
}
```

**Controller usage:**
```typescript
import { ApiSignup } from '../docs/auth.docs';

@ApiTags('Auth')          // stays on controller (class-level)
@Controller('auth')
export class AuthController {
  @Post('signup')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiSignup()            // single decorator replaces 5-8 lines
  async signup(@Body() dto: SignupDto) { ... }
}
```

**What stays on the controller:**
- `@ApiTags()` — class-level grouping
- `@ApiBearerAuth()` — class-level when all endpoints are protected
- `@Controller()`, `@Get/@Post/@Delete`, `@Public()`, `@HttpCode()` — routing/behavior

**What goes in docs:**
- `@ApiOperation()`, `@ApiBody()`, `@ApiResponse()`, `@ApiParam()`, `@ApiQuery()`, `@ApiHeader()`, `@ApiProduces()`
- Method-level `@ApiBearerAuth()` (when only some endpoints need it)
- Inline `schema: { type: 'object', properties: {...} }` blocks

**Naming convention:**
- Function: `Api` + PascalCase endpoint name (e.g., `ApiSignup()`, `ApiGetToken()`, `ApiForgotPassword()`)

### Controller Example
```typescript
import { ApiFindAllUsers, ApiDeleteAccount } from '../docs/user.docs';

@Controller('users')
@ApiTags('Users')
@ApiBearerAuth()
export class UsersController {
  constructor(
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  @Get()
  @ApiFindAllUsers()
  async findAll() {
    return this.usersService.findAll();
  }

  @Delete('account')
  @ApiDeleteAccount()
  async deleteAccount(@UserId() userId: string) {
    return this.usersService.deactivate(userId);
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

The project uses RFC 9457 Problem Details format for all error responses. All exceptions are automatically transformed by `HttpExceptionFilter` from `@vritti/api-sdk`.

#### Error Response Format
```json
{
  "title": "Invalid Code",
  "status": 400,
  "detail": "The verification code you entered is incorrect. Please check the code and try again.",
  "errors": [
    { "field": "code", "message": "Invalid verification code" }
  ]
}
```

#### Exception Constructor Patterns

**CRITICAL: Choose the correct pattern based on whether the error is field-specific or general.**

```typescript
import { BadRequestException, UnauthorizedException, NotFoundException } from '@vritti/api-sdk';

// Pattern 1: Simple string - for general errors without field context
throw new UnauthorizedException('Your session has expired. Please log in again.');

// Pattern 2: Field-specific error - USE ONLY when error relates to a FORM FIELD
throw new BadRequestException('email', 'Invalid email format');

// Pattern 3: Array of field errors
throw new BadRequestException([
  { field: 'email', message: 'Invalid email' },
  { field: 'password', message: 'Password too weak' }
]);

// Pattern 4: ProblemOptions object - PREFERRED for rich error context
// Use when you need label, detail, AND/OR field errors together
throw new BadRequestException({
  label: 'Invalid Code',
  detail: 'The verification code you entered is incorrect. Please check the code and try again.',
  errors: [{ field: 'code', message: 'Invalid verification code' }],
});
```

#### ProblemOptions Quality Rules

The frontend renders `label` as **AlertTitle** and `detail` as **AlertDescription**, shown together on screen. Follow these rules:

**Rule 1: Label and detail must NOT repeat each other**
```typescript
// WRONG - detail repeats the label
label: 'Session Expired',
detail: 'Your session has expired. Your 2FA setup session has expired. Please start again.',

// CORRECT - detail adds actionable info beyond the label
label: 'Session Expired',
detail: 'Please start the setup process again.',
```

**Rule 2: `errors[].message` must be SHORT (2-5 words), never duplicate detail**
```typescript
// WRONG
detail: 'The verification code is incorrect. Please try again.',
errors: [{ field: 'code', message: 'The verification code is incorrect. Please try again.' }],

// CORRECT
detail: 'The verification code is incorrect. Please try again.',
errors: [{ field: 'code', message: 'Invalid verification code' }],
```

**Rule 3: Every ProblemOptions with `errors[]` MUST have a `label`**
```typescript
// WRONG - missing label, UI shows generic "Bad Request"
throw new BadRequestException({
  detail: 'The code has expired.',
  errors: [{ field: 'code', message: 'Code expired' }],
});

// CORRECT
throw new BadRequestException({
  label: 'Code Expired',
  detail: 'Your verification code has expired. Please request a new code.',
  errors: [{ field: 'code', message: 'Code expired' }],
});
```

**Rule 4: One error per field, don't use ProblemOptions for simple cases**
```typescript
// WRONG - two errors on same field
errors: [
  { field: 'password', message: 'Invalid password' },
  { field: 'password', message: 'A password is already set' },
]

// CORRECT - one error per field
errors: [{ field: 'password', message: 'Invalid password' }]

// Overkill - ProblemOptions not needed for simple case
throw new NotFoundException({ detail: 'User not found.' });

// Better
throw new NotFoundException('User not found.');
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

// WRONG - label and detail say the same thing
throw new BadRequestException({
  label: 'Unsupported Verification Method',
  detail: 'Unsupported verification method: sms',
});

// CORRECT - detail adds value beyond the label
throw new BadRequestException({
  label: 'Unsupported Verification Method',
  detail: "The method 'sms' is not available. Please use a different verification method.",
});
```

#### When to Use Each Pattern

| Scenario | Pattern | Example |
|----------|---------|---------|
| Login failure | Simple string | `throw new UnauthorizedException('Invalid email or password.')` |
| Session expired | Simple string | `throw new UnauthorizedException('Session expired.')` |
| Resource not found | Simple string | `throw new NotFoundException('User not found.')` |
| DTO validation (auto) | Field + message | Handled by ValidationPipe automatically |
| Form field error with heading | ProblemOptions | `{ label: 'Invalid Code', detail: '...', errors: [{ field: 'code', message: 'Invalid code' }] }` |
| Rich error with heading | ProblemOptions | `{ label: '2FA Already Enabled', detail: 'Please disable your current method first.' }` |

#### Frontend Integration

The frontend renders exceptions as follows:
- **`label`** → `AlertTitle` (heading text)
- **`detail`** → `AlertDescription` (body text)
- **`errors[].field`** → inline error on matching form field
- **`errors[]` without `field`** → root form error (if `showRootError={true}`)

The `mapApiErrorsToForm` function:
1. If `errors[].field` matches a form field → displays inline on that field
2. If `errors[].field` doesn't match any field → error is LOST (bug!)
3. If `errors[]` has no `field` → displays as root form error

**Always ensure your `field` value matches an actual form field name, or omit it entirely.**
