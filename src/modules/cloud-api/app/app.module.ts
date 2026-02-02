import { Module } from '@nestjs/common';
import { AppController, AppCatalogController } from './app.controller';
import { AppService } from './app.service';
import { AppRepository } from './app.repository';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { CompanyModule } from '../company/company.module';

@Module({
  imports: [ActivityLogModule, CompanyModule],
  controllers: [AppController, AppCatalogController],
  providers: [AppService, AppRepository],
  exports: [AppService, AppRepository],
})
export class CompanyAppModule {}
