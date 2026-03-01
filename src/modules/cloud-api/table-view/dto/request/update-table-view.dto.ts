import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTableViewDto } from './create-table-view.dto';

// Partial update — all fields optional, tableSlug is not updatable
export class UpdateTableViewDto extends PartialType(OmitType(CreateTableViewDto, ['tableSlug'] as const)) {}
