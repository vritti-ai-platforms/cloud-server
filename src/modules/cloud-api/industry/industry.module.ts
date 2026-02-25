import { Module } from '@nestjs/common';
import { IndustryController } from './controllers/industry.controller';
import { IndustryRepository } from './repositories/industry.repository';
import { IndustryService } from './services/industry.service';

@Module({
  controllers: [IndustryController],
  providers: [IndustryService, IndustryRepository],
  exports: [IndustryService],
})
export class IndustryModule {}
