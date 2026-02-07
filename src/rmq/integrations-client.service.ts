import { Inject, Injectable } from '@nestjs/common';
import type { ClientProxy } from '@nestjs/microservices';
import { RmqClientService } from '@vritti/api-sdk';

/**
 * RabbitMQ client service for the integrations microservice.
 *
 * Extends the base RmqClientService from @vritti/api-sdk which provides
 * timeout and retry logic for message sending (RPC) and fire-and-forget emit.
 */
@Injectable()
export class IntegrationsClientService extends RmqClientService {
  // pnpm strict mode resolves @nestjs/microservices to different store paths
  // in api-nexus vs @vritti/api-sdk, making structurally identical ClientProxy
  // types appear incompatible to TS (protected 'routingMap' mismatch).
  // Declaring as `any` satisfies the abstract contract without runtime impact.
  protected client: any;

  constructor(
    @Inject('INTEGRATIONS_SERVICE') client: ClientProxy,
  ) {
    super();
    this.client = client;
  }

  /**
   * Ping the integrations microservice to verify the RabbitMQ pipeline.
   */
  ping(): Promise<{ status: string; timestamp: string }> {
    return this.send({ role: 'integrations', cmd: 'ping' }, {});
  }
}
