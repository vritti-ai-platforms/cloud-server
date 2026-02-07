import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@vritti/api-sdk';
import { AppService } from './app.service';
import { IntegrationsClientService } from './rmq';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly integrationsClient: IntegrationsClientService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Returns a welcome message indicating the API is running',
    type: String,
  })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test/ping-integrations')
  @Public()
  @ApiOperation({ summary: 'Ping integrations microservice via RabbitMQ' })
  @ApiResponse({
    status: 200,
    description: 'Returns a pong response from the integrations microservice',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'pong' },
        timestamp: { type: 'string', format: 'date-time', example: '2026-02-07T12:00:00.000Z' },
      },
      required: ['status', 'timestamp'],
    },
  })
  async pingIntegrations(): Promise<{ status: string; timestamp: string }> {
    return this.integrationsClient.ping();
  }
}
