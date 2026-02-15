import { Inject, Injectable } from '@nestjs/common';
import type { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { ServiceUnavailableException } from '@vritti/api-sdk';

/**
 * RabbitMQ client service for the integrations microservice.
 *
 * TODO: Extend RmqClientService from @vritti/api-sdk once feat/rabbitmq-utilities merges to main
 */
@Injectable()
export class IntegrationsClientService {
  constructor(
    @Inject('INTEGRATIONS_SERVICE') private readonly client: ClientProxy,
  ) {}

  private send<T>(pattern: object, data: unknown): Promise<T> {
    return firstValueFrom(
      this.client.send<T>(pattern, data).pipe(
        timeout(10000),
        catchError((err) => {
          if (err.name === 'TimeoutError') {
            throw new ServiceUnavailableException('Service timeout. Please try again later.');
          }
          throw err;
        }),
      ),
    );
  }

  /**
   * Ping the integrations microservice to verify the RabbitMQ pipeline.
   */
  ping(): Promise<{ status: string; timestamp: string }> {
    return this.send({ role: 'integrations', cmd: 'ping' }, {});
  }
}
