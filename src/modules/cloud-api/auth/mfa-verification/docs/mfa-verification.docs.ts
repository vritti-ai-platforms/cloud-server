import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  MfaVerificationResponseDto,
  PasskeyMfaOptionsDto,
  SendSmsOtpDto,
  SmsOtpSentResponseDto,
  StartPasskeyMfaDto,
  VerifyMfaTotpDto,
  VerifyPasskeyMfaDto,
  VerifySmsOtpDto,
} from '../dto';

export function ApiVerifyTotp() {
  return applyDecorators(
    ApiOperation({ summary: 'Verify TOTP code for MFA' }),
    ApiBody({ type: VerifyMfaTotpDto }),
    ApiResponse({ status: 200, description: 'TOTP code verified successfully', type: MfaVerificationResponseDto }),
    ApiResponse({ status: 400, description: 'Invalid TOTP code or malformed request' }),
    ApiResponse({ status: 401, description: 'MFA session expired or invalid' }),
  );
}

export function ApiSendSmsOtp() {
  return applyDecorators(
    ApiOperation({ summary: 'Send SMS OTP for MFA verification' }),
    ApiBody({ type: SendSmsOtpDto }),
    ApiResponse({ status: 200, description: 'SMS OTP sent successfully', type: SmsOtpSentResponseDto }),
    ApiResponse({ status: 400, description: 'Invalid request or phone number not configured' }),
    ApiResponse({ status: 401, description: 'MFA session expired or invalid' }),
  );
}

export function ApiVerifySmsOtp() {
  return applyDecorators(
    ApiOperation({ summary: 'Verify SMS OTP code for MFA' }),
    ApiBody({ type: VerifySmsOtpDto }),
    ApiResponse({ status: 200, description: 'SMS OTP verified successfully', type: MfaVerificationResponseDto }),
    ApiResponse({ status: 400, description: 'Invalid OTP code or malformed request' }),
    ApiResponse({ status: 401, description: 'MFA session expired or invalid' }),
  );
}

export function ApiStartPasskeyMfa() {
  return applyDecorators(
    ApiOperation({ summary: 'Start passkey authentication for MFA' }),
    ApiBody({ type: StartPasskeyMfaDto }),
    ApiResponse({ status: 200, description: 'Passkey authentication options generated successfully', type: PasskeyMfaOptionsDto }),
    ApiResponse({ status: 400, description: 'Invalid request or no passkeys registered' }),
    ApiResponse({ status: 401, description: 'MFA session expired or invalid' }),
  );
}

export function ApiVerifyPasskeyMfa() {
  return applyDecorators(
    ApiOperation({ summary: 'Verify passkey authentication for MFA' }),
    ApiBody({ type: VerifyPasskeyMfaDto }),
    ApiResponse({ status: 200, description: 'Passkey verified successfully', type: MfaVerificationResponseDto }),
    ApiResponse({ status: 400, description: 'Invalid passkey credential or malformed request' }),
    ApiResponse({ status: 401, description: 'MFA session expired or invalid' }),
  );
}
