import { ApiProperty } from '@nestjs/swagger';

export class AssignProvidersResponseDto {
  @ApiProperty({ example: 3, description: 'Number of provider assignments created' })
  assigned: number;
}
