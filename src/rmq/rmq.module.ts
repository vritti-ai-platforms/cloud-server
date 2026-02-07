import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { IntegrationsClientService } from './integrations-client.service';

/**
 * RabbitMQ Module
 * Registers RMQ client proxies for inter-service communication
 */
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'INTEGRATIONS_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL', 'amqp://localhost:5672')],
            queue: 'integrations_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [IntegrationsClientService],
  exports: [IntegrationsClientService],
})
export class RmqModule {}
