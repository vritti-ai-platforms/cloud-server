import { Module } from '@nestjs/common';
import { TableStatesController } from './controllers/table-states.controller';
import { TableViewsController } from './controllers/table-views.controller';
import { TableViewRepository } from './repositories/table-view.repository';
import { TableViewService } from './services/table-view.service';

@Module({
  controllers: [TableStatesController, TableViewsController],
  providers: [TableViewService, TableViewRepository],
  exports: [TableViewService],
})
export class TableViewModule {}
