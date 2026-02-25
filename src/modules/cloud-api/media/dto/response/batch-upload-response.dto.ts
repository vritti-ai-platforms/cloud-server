import { ApiProperty } from '@nestjs/swagger';
import { MediaDto } from '../entity/media.dto';

export class BatchUploadResponseDto {
  @ApiProperty({ type: [MediaDto], description: 'Successfully uploaded media items' })
  uploaded: MediaDto[];

  @ApiProperty({ example: 0, description: 'Number of failed uploads' })
  failed: number;
}
