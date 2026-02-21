import { Body, Controller, Get, Headers, Logger, Param, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public, SkipCsrf } from '@vritti/api-sdk';
import type { FastifyRequest } from 'fastify';
import { ApiHandleWebhook, ApiVerifyWebhook } from '../docs/verification-webhook.docs';
import { TwilioSmsWebhookDto } from '../dto/request/sms-webhook.dto';
import { WebhookChallengeQueryDto } from '../dto/request/webhook-challenge-query.dto';
import { WebhookProviderParamDto } from '../dto/request/webhook-provider-param.dto';
import { WebhookSignatureHeadersDto } from '../dto/request/webhook-signature-headers.dto';
import { WhatsAppWebhookDto } from '../dto/request/whatsapp-webhook.dto';
import { VerificationWebhookService } from '../services/verification-webhook.service';

@ApiTags('Onboarding - Webhooks')
@Controller('onboarding/webhooks/:provider')
@SkipCsrf()
export class VerificationWebhookController {
  private readonly logger = new Logger(VerificationWebhookController.name);

  constructor(private readonly verificationWebhookService: VerificationWebhookService) {}

  // Handles the webhook subscription verification challenge from WhatsApp or SMS providers
  @Get()
  @Public()
  @ApiVerifyWebhook()
  async verifyWebhook(
    @Param() { provider }: WebhookProviderParamDto,
    @Query() query: WebhookChallengeQueryDto,
  ): Promise<string> {
    this.logger.log(`GET /onboarding/webhooks/${provider} - verification challenge`);
    return this.verificationWebhookService.verifyChallenge(provider, query);
  }

  // Validates the webhook signature and dispatches the payload for async processing
  @Post()
  @Public()
  @ApiHandleWebhook()
  async handleWebhook(
    @Param() { provider }: WebhookProviderParamDto,
    @Req() request: FastifyRequest,
    @Headers() headers: WebhookSignatureHeadersDto,
    @Body() payload: WhatsAppWebhookDto | TwilioSmsWebhookDto,
  ): Promise<{ status: string }> {
    this.logger.log(`POST /onboarding/webhooks/${provider}`);
    const rawBody = request.rawBody as string; // Ensure rawBody is a string for signature validation
    return this.verificationWebhookService.handleWebhook(provider, rawBody, headers, payload);
  }
}
