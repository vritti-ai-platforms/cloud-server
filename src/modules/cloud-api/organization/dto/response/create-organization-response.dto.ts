import { ApiProperty } from '@nestjs/swagger';
import { OrgListItemDto } from '../entity/organization.dto';

// Wraps OrgListItemDto with a success message for toast display
export class CreateOrganizationResponseDto extends OrgListItemDto {
  @ApiProperty({ example: 'Organization created successfully' })
  message: string;
}
