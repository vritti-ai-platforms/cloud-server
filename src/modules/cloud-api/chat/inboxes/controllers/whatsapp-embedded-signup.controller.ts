import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Tenant, type TenantInfo } from '@vritti/api-sdk';
import {
  ApiGetWhatsAppConfig,
  ApiProcessWhatsAppEmbeddedSignup,
} from '../docs/whatsapp-embedded-signup.docs';
import type { WhatsAppConfigResponseDto } from '../dto/response/whatsapp-config-response.dto';
import type { WhatsAppEmbeddedSignupResponseDto } from '../dto/response/whatsapp-embedded-signup-response.dto';
import { WhatsAppEmbeddedSignupDto } from '../dto/request/whatsapp-embedded-signup.dto';
import { WhatsAppEmbeddedSignupService } from '../services/whatsapp-embedded-signup.service';

@ApiTags('Inboxes')
@ApiBearerAuth()
@Controller('inboxes/whatsapp')
export class WhatsAppEmbeddedSignupController {
  private readonly logger = new Logger(WhatsAppEmbeddedSignupController.name);

  constructor(
    private readonly whatsappService: WhatsAppEmbeddedSignupService,
  ) {}

  // Returns the Facebook App ID and Config ID for initializing the JS SDK
  @Get('config')
  @ApiGetWhatsAppConfig()
  getConfig(): WhatsAppConfigResponseDto {
    this.logger.log('GET /inboxes/whatsapp/config');
    return this.whatsappService.getPublicConfig();
  }

  // Processes the WhatsApp Embedded Signup result from the frontend
  @Post('embedded-signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiProcessWhatsAppEmbeddedSignup()
  async processEmbeddedSignup(
    @Tenant() tenant: TenantInfo,
    @Body() dto: WhatsAppEmbeddedSignupDto,
  ): Promise<WhatsAppEmbeddedSignupResponseDto> {
    this.logger.log(`POST /inboxes/whatsapp/embedded-signup for tenant ${tenant.id}`);
    return this.whatsappService.processEmbeddedSignup(tenant.id, dto);
  }
}
