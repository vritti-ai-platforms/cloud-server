import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { type Contact, contacts } from '@/db/schema';

@Injectable()
export class ContactRepository extends PrimaryBaseRepository<typeof contacts> {
  constructor(database: PrimaryDatabaseService) {
    super(database, contacts);
  }

  async findByIdAndTenantId(id: string, tenantId: string): Promise<Contact | undefined> {
    return this.model.findFirst({
      where: { id, tenantId },
    });
  }

  async findByPhone(tenantId: string, phone: string): Promise<Contact | undefined> {
    return this.model.findFirst({
      where: { tenantId, phone },
    });
  }

  async findByUsername(tenantId: string, username: string): Promise<Contact | undefined> {
    return this.model.findFirst({
      where: { tenantId, username },
    });
  }

  async findByEmail(tenantId: string, email: string): Promise<Contact | undefined> {
    return this.model.findFirst({
      where: { tenantId, email },
    });
  }
}
