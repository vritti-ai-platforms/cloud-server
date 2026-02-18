import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { contactInboxes } from '@/db/schema';

@Injectable()
export class ContactInboxRepository extends PrimaryBaseRepository<typeof contactInboxes> {
  constructor(database: PrimaryDatabaseService) {
    super(database, contactInboxes);
  }

  async findByInboxAndSourceId(inboxId: string, sourceId: string) {
    return this.model.findFirst({
      where: { inboxId, sourceId },
      with: { contact: true },
    });
  }

  async findByContactId(contactId: string) {
    return this.model.findMany({
      where: { contactId },
    });
  }
}
