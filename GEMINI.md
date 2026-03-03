# vritti-api-nexus - Gemini CLI Context

This project is the main backend API for the Vritti SaaS Platform, built with NestJS, Fastify, Prisma, and PostgreSQL.

## Project Structure
- `src/modules/`: Feature modules (auth, tenants, users, onboarding, etc.).
- `src/modules/<module>/controllers/`: Controller logic only.
- `src/modules/<module>/services/`: Business logic.
- `src/modules/<module>/repositories/`: Data access.
- `src/modules/<module>/dto/`: Request/Response DTOs.
- `src/modules/<module>/docs/`: Swagger/OpenAPI decorators.

## Core Conventions
- **Module Structure**: One `module.ts` per top-level module. Submodules are folders, not NestJS modules.
- **Swagger Documentation**: Swagger decorators MUST live in `docs/*.docs.ts` files, NOT inline on controllers. Use `applyDecorators()`.
- **Exception Handling**: Use RFC 9457 Problem Details format. Import exceptions from `@vritti/api-sdk`, NOT `@nestjs/common`.
- **Error Messages**: Use Pattern 4 (`ProblemOptions`) for rich error context. Label and detail must not repeat each other.
- **Configuration**: Extract environment variables into a central `ENV` constant (e.g., in `main.ts`). Access via `ConfigService` in modules.
- **CORS**: Group and extract CORS origins into a separate configuration.

## Available Skills
- `vritti-api-nexus-agent`: Use this for building/modifying backend features, controllers, and services.
- `api-sdk-maintainer`: Use this for tasks involving the `@vritti/api-sdk` shared library.
- `postman-collection-syncer`: Use this to keep Postman collections in sync with the API.

## Rules
Detailed coding rules are available in `.gemini/rules/`.
- `backend-module-structure.md`: Folder and module organization.
- `backend-controller.md` / `backend-service.md` / `backend-repository.md`: Role and implementation of each layer.
- `swagger-docs.md`: Patterns for externalizing Swagger decorators.
- `error-handling.md`: Rich error context and RFC 9457 standards.
- `backend-dto.md`: Organization of request and response objects.

## Development
- `pnpm dev`: Start server on `http://local.vrittiai.com:3000`.
- `USE_HTTPS=true pnpm dev`: Start on `https://local.vrittiai.com:3000`.
- `Swagger docs`: `{protocol}://local.vrittiai.com:3000/api/docs`.
- `pnpm prisma migrate dev`: Apply database migrations.
