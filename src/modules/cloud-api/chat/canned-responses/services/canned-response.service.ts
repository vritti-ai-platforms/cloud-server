import { Injectable, Logger } from '@nestjs/common';
import { ConflictException, NotFoundException } from '@vritti/api-sdk';
import { CannedResponseResponseDto } from '../dto/entity/canned-response-response.dto';
import type { CreateCannedResponseDto } from '../dto/request/create-canned-response.dto';
import type { UpdateCannedResponseDto } from '../dto/request/update-canned-response.dto';
import { CannedResponseRepository } from '../repositories/canned-response.repository';

@Injectable()
export class CannedResponseService {
  private readonly logger = new Logger(CannedResponseService.name);

  constructor(private readonly cannedResponseRepository: CannedResponseRepository) {}

  /** Retrieves all canned responses for a tenant */
  async findAll(tenantId: string): Promise<CannedResponseResponseDto[]> {
    const responses = await this.cannedResponseRepository.findAllByTenantId(tenantId);
    return responses.map(CannedResponseResponseDto.from);
  }

  /** Creates a new canned response for a tenant */
  async create(tenantId: string, dto: CreateCannedResponseDto): Promise<CannedResponseResponseDto> {
    let response;
    try {
      response = await this.cannedResponseRepository.create({ tenantId, ...dto });
    } catch (error) {
      this.handleUniqueConstraintError(error);
      throw error;
    }

    this.logger.log(`Created canned response: ${response.shortCode} (${response.id})`);
    return CannedResponseResponseDto.from(response);
  }

  /** Updates an existing canned response */
  async update(id: string, tenantId: string, dto: UpdateCannedResponseDto): Promise<CannedResponseResponseDto> {
    const existing = await this.cannedResponseRepository.findByIdAndTenantId(id, tenantId);
    if (!existing) {
      throw new NotFoundException('Canned response not found.');
    }

    let updated;
    try {
      updated = await this.cannedResponseRepository.update(id, dto);
    } catch (error) {
      this.handleUniqueConstraintError(error);
      throw error;
    }

    this.logger.log(`Updated canned response: ${updated.shortCode} (${updated.id})`);
    return CannedResponseResponseDto.from(updated);
  }

  /** Deletes a canned response by ID */
  async delete(id: string, tenantId: string): Promise<void> {
    const existing = await this.cannedResponseRepository.findByIdAndTenantId(id, tenantId);
    if (!existing) {
      throw new NotFoundException('Canned response not found.');
    }

    await this.cannedResponseRepository.delete(id);
    this.logger.log(`Deleted canned response: ${existing.shortCode} (${id})`);
  }

  /** Converts PostgreSQL unique constraint violations (23505) to ConflictException */
  private handleUniqueConstraintError(error: unknown): void {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as Error & { code: string }).code === '23505'
    ) {
      throw new ConflictException({
        label: 'Duplicate Short Code',
        detail: 'A canned response with this short code already exists. Please use a different short code.',
        errors: [{ field: 'shortCode', message: 'Already exists' }],
      });
    }
  }
}
