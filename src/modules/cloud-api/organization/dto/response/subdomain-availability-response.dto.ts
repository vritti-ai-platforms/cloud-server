import { ApiProperty } from '@nestjs/swagger';

export class SubdomainAvailabilityResponseDto {
  @ApiProperty()
  available: boolean;
}
