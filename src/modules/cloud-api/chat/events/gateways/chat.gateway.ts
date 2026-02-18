import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { PrimaryDatabaseService } from '@vritti/api-sdk';
import { Server, Socket } from 'socket.io';
import type { AccessTokenPayload } from '../../../../../config/jwt.config';
import { CORS_ORIGINS } from '../../../../../config/cors.config';

// ============================================================================
// Gateway
// ============================================================================

@WebSocketGateway({
  cors: {
    origin: CORS_ORIGINS,
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly primaryDatabase: PrimaryDatabaseService,
  ) {}

  // ===========================================================================
  // Lifecycle Hooks
  // ===========================================================================

  // Logs that the WebSocket gateway is ready
  afterInit(): void {
    this.logger.log('WebSocket gateway initialized');
  }

  // ===========================================================================
  // Connection Handling
  // ===========================================================================

  // Authenticates the WebSocket client via JWT and joins the tenant room
  async handleConnection(client: Socket): Promise<void> {
    try {
      // 1. Extract and verify JWT token from handshake auth
      const token = client.handshake.auth?.token as string | undefined;

      if (!token) {
        this.logger.warn('WebSocket connection rejected: no token provided');
        client.emit('error', { message: 'Authentication token is required' });
        client.disconnect(true);
        return;
      }

      let userId: string;

      try {
        const decoded = this.jwtService.verify<AccessTokenPayload>(token);
        userId = decoded.userId;
      } catch {
        this.logger.warn('WebSocket connection rejected: invalid token');
        client.emit('error', { message: 'Invalid or expired authentication token' });
        client.disconnect(true);
        return;
      }

      if (!userId) {
        this.logger.warn('WebSocket connection rejected: token missing userId');
        client.emit('error', { message: 'Invalid token payload' });
        client.disconnect(true);
        return;
      }

      // 2. Extract and resolve tenant from subdomain query parameter
      const subdomain = client.handshake.query?.subdomain as string | undefined;

      if (!subdomain) {
        this.logger.warn(`WebSocket connection rejected for user ${userId}: no subdomain provided`);
        client.emit('error', { message: 'Subdomain query parameter is required' });
        client.disconnect(true);
        return;
      }

      const tenant = await this.primaryDatabase.getTenantInfo(subdomain);

      if (!tenant) {
        this.logger.warn(`WebSocket connection rejected for user ${userId}: tenant not found or inactive (${subdomain})`);
        client.emit('error', { message: 'Tenant not found or inactive' });
        client.disconnect(true);
        return;
      }

      // 3. Store tenant and user data on the socket for later use
      client.data.tenantId = tenant.id;
      client.data.userId = userId;

      // 4. Join the tenant room for broadcasting
      client.join(`tenant:${tenant.id}`);

      this.logger.log(`WebSocket connected: user ${userId}, tenant ${tenant.id} (${subdomain})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`WebSocket connection error: ${message}`, stack);
      client.emit('error', { message: 'Connection failed' });
      client.disconnect(true);
    }
  }

  // Logs the WebSocket client disconnection
  handleDisconnect(client: Socket): void {
    const { tenantId, userId } = client.data ?? {};
    this.logger.log(`WebSocket disconnected: user ${userId ?? 'unknown'}, tenant ${tenantId ?? 'unknown'}`);
  }

  // ===========================================================================
  // Broadcasting
  // ===========================================================================

  // Emits an event to all connected clients in a tenant room
  sendToTenant(tenantId: string, event: string, data: unknown): void {
    const room = `tenant:${tenantId}`;
    this.logger.debug(`Emitting ${event} to ${room}`);
    this.server.to(room).emit(event, data);
  }
}
