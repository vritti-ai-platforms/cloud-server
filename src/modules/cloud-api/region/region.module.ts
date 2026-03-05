import { Module } from '@nestjs/common';
import { AdminApiModule } from '@/modules/admin-api/admin-api.module';
import { RegionController } from './controllers/region.controller';
import { RegionService } from './services/region.service';

@Module({
  imports: [AdminApiModule],
  controllers: [RegionController],
  providers: [RegionService],
})
export class RegionModule {}
