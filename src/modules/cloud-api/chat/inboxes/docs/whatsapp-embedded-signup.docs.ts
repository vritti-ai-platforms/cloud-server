import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WhatsAppEmbeddedSignupDto } from '../dto/request/whatsapp-embedded-signup.dto';
import { WhatsAppConfigResponseDto } from '../dto/response/whatsapp-config-response.dto';
import { WhatsAppEmbeddedSignupResponseDto } from '../dto/response/whatsapp-embedded-signup-response.dto';

export function ApiGetWhatsAppConfig() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get WhatsApp Embedded Signup configuration',
      description:
        'Returns the Facebook App ID and Config ID needed to initialize the Facebook JS SDK ' +
        'and launch the WhatsApp Embedded Signup popup on the frontend.',
    }),
    ApiResponse({
      status: 200,
      description: 'WhatsApp configuration retrieved successfully.',
      type: WhatsAppConfigResponseDto,
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication.' }),
  );
}

export function ApiProcessWhatsAppEmbeddedSignup() {
  return applyDecorators(
    ApiOperation({
      summary: 'Process WhatsApp Embedded Signup',
      description:
        'Processes the result of the WhatsApp Embedded Signup popup. Exchanges the authorization code ' +
        'for an access token, fetches phone number details, creates or reconnects the inbox, ' +
        'and subscribes to WABA webhooks.',
    }),
    ApiBody({ type: WhatsAppEmbeddedSignupDto }),
    ApiResponse({
      status: 201,
      description: 'WhatsApp inbox created or reconnected successfully.',
      type: WhatsAppEmbeddedSignupResponseDto,
    }),
    ApiResponse({ status: 400, description: 'Invalid input data or token exchange failed.' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication.' }),
  );
}
