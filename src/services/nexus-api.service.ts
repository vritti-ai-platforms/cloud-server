import https from 'node:https';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class NexusApiService {
  private readonly logger = new Logger(NexusApiService.name);

  // Shared HTTPS agent for self-signed certs in development
  private readonly httpsAgent = new https.Agent({ rejectUnauthorized: false });

  // Creates an organization in api-nexus and returns the nexus org ID
  async createOrganization(
    nexusUrl: string,
    webhookSecret: string,
    data: {
      name: string;
      subdomain: string;
      size: string;
      planId?: string;
      mediaId?: string;
    },
  ): Promise<{ id: string }> {
    const response = await axios.post<{ id: string }>(`${nexusUrl}/organizations/webhook`, data, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': webhookSecret,
      },
      timeout: 10000,
      httpsAgent: this.httpsAgent,
    });
    this.logger.log(`Created organization in nexus: ${data.subdomain} (${response.data.id})`);
    return response.data;
  }
}
