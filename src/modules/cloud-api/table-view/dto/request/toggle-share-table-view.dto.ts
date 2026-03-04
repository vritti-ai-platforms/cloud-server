import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ToggleShareTableViewDto {
  @ApiProperty({ description: 'Whether the view should be visible to all users', example: true })
  @IsBoolean()
  isShared: boolean;
}
