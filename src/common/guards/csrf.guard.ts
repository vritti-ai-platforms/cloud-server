import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SKIP_CSRF_KEY } from '../decorators/skip-csrf.decorator';

/**
 * Custom CSRF Guard that respects the @SkipCsrf() decorator.
 *
 * This guard validates CSRF tokens for non-safe HTTP methods (POST, PUT, DELETE, etc.)
 * but allows routes decorated with @SkipCsrf() to bypass validation.
 *
 * This is necessary for webhook endpoints that receive requests from external services
 * (e.g., WhatsApp, Twilio) which cannot include CSRF tokens.
 */
@Injectable()
export class AppCsrfGuard implements CanActivate {
  private readonly logger = new Logger(AppCsrfGuard.name);

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check for @SkipCsrf() decorator on handler or class
    const skipCsrf = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipCsrf) {
      this.logger.debug('CSRF validation skipped due to @SkipCsrf decorator');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const reply = context.switchToHttp().getResponse();

    // Allow safe methods (GET, HEAD, OPTIONS) without CSRF validation
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(request.method)) {
      return true;
    }

    // Validate CSRF token for non-safe methods
    try {
      const fastifyInstance = request.server;
      if (!fastifyInstance.csrfProtection) {
        this.logger.error('CSRF protection plugin not found. Ensure @fastify/csrf-protection is registered.');
        throw new ForbiddenException('CSRF protection not configured');
      }

      await new Promise<void>((resolve, reject) => {
        fastifyInstance.csrfProtection(request, reply, (err: Error) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      this.logger.debug(`CSRF validation successful for ${request.method} ${request.url}`);
      return true;
    } catch (error) {
      this.logger.warn(
        `CSRF validation failed for ${request.method} ${request.url}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new ForbiddenException({
        errors: [
          {
            field: 'csrf',
            message: 'Invalid or missing CSRF token',
          },
        ],
        message: 'CSRF validation failed',
      });
    }
  }
}
