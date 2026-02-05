import { ApiProperty } from '@nestjs/swagger';
import type { Session } from '@/db/schema';

export class SessionResponseDto {
  @ApiProperty({
    description: 'Unique session identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Device information parsed from user agent',
    example: 'Chrome on macOS',
  })
  device: string;

  @ApiProperty({
    description: 'Geographic location based on IP address',
    example: 'San Francisco, CA',
  })
  location: string;

  @ApiProperty({
    description: 'IP address of the session',
    example: '192.168.1.1',
  })
  ipAddress: string;

  @ApiProperty({
    description: 'Last activity timestamp',
    example: '2026-02-04T12:30:00Z',
  })
  lastActive: Date;

  @ApiProperty({
    description: 'Whether this is the current session',
    example: false,
  })
  isCurrent: boolean;

  static from(session: Session, currentAccessToken: string): SessionResponseDto {
    return {
      sessionId: session.id,
      device: this.parseUserAgent(session.userAgent),
      location: 'Unknown', // Stub for now, can add IP geolocation later
      ipAddress: session.ipAddress || 'Unknown',
      lastActive: session.updatedAt,
      isCurrent: session.accessToken === currentAccessToken,
    };
  }

  private static parseUserAgent(userAgent: string | null): string {
    if (!userAgent) return 'Unknown Device';

    // Simple parsing - can be enhanced with ua-parser-js library
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';

    // Detect browser
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      browser = 'Chrome';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browser = 'Safari';
    } else if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
    } else if (userAgent.includes('Edg')) {
      browser = 'Edge';
    }

    // Detect OS
    if (userAgent.includes('Windows')) {
      os = 'Windows';
    } else if (userAgent.includes('Mac OS')) {
      os = 'macOS';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    } else if (userAgent.includes('Android')) {
      os = 'Android';
    } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      os = 'iOS';
    }

    return `${browser} on ${os}`;
  }
}
