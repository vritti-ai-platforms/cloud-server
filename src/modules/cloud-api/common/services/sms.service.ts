import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  /**
   * Send SMS OTP
   * TODO: Integrate with Twilio API
   */
  async sendOtp(phone: string, otp: string): Promise<void> {
    this.logger.log(`[MOCK] Sending SMS OTP to ${phone}: ${otp}`);

    // TODO: Implement Twilio integration
    // const accountSid = process.env.TWILIO_ACCOUNT_SID;
    // const authToken = process.env.TWILIO_AUTH_TOKEN;
    // const client = twilio(accountSid, authToken);
    //
    // await client.messages.create({
    //   body: `Your verification code is: ${otp}. This code will expire in 5 minutes.`,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: phone,
    // });

    // For now, just log it (development/testing)
    this.logger.debug(`SMS OTP for ${phone}: ${otp}`);
  }

  /**
   * Send WhatsApp QR verification message
   * TODO: Implement WhatsApp Business API integration
   */
  async sendWhatsAppQrMessage(phone: string, qrData: string): Promise<void> {
    this.logger.log(`[MOCK] Sending WhatsApp QR to ${phone}`);

    // TODO: Implement WhatsApp Business API
    // This will send a QR code that user scans to verify their number

    this.logger.debug(`WhatsApp QR data for ${phone}: ${qrData}`);
  }

  /**
   * Send SMS QR verification message
   * TODO: Implement Twilio API for SMS with link
   */
  async sendSmsQrMessage(phone: string, qrLink: string): Promise<void> {
    this.logger.log(`[MOCK] Sending SMS QR link to ${phone}`);

    // TODO: Implement Twilio integration with link to QR

    this.logger.debug(`SMS QR link for ${phone}: ${qrLink}`);
  }
}
