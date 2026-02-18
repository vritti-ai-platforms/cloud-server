import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Tenant, type TenantInfo } from '@vritti/api-sdk';
import {
  ApiCreateCannedResponse,
  ApiDeleteCannedResponse,
  ApiListCannedResponses,
  ApiUpdateCannedResponse,
} from '../docs/canned-response.docs';
import { CannedResponseResponseDto } from '../dto/entity/canned-response-response.dto';
import { CreateCannedResponseDto } from '../dto/request/create-canned-response.dto';
import { UpdateCannedResponseDto } from '../dto/request/update-canned-response.dto';
import { CannedResponseService } from '../services/canned-response.service';

@ApiTags('Canned Responses')
@ApiBearerAuth()
@Controller('canned-responses')
export class CannedResponseController {
  constructor(private readonly cannedResponseService: CannedResponseService) {}

  // Lists all canned responses for the tenant
  @Get()
  @ApiListCannedResponses()
  async findAll(@Tenant() tenant: TenantInfo): Promise<CannedResponseResponseDto[]> {
    return this.cannedResponseService.findAll(tenant.id);
  }

  // Creates a new canned response for the tenant
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateCannedResponse()
  async create(
    @Tenant() tenant: TenantInfo,
    @Body() dto: CreateCannedResponseDto,
  ): Promise<CannedResponseResponseDto> {
    return this.cannedResponseService.create(tenant.id, dto);
  }

  // Updates an existing canned response
  @Patch(':id')
  @ApiUpdateCannedResponse()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantInfo,
    @Body() dto: UpdateCannedResponseDto,
  ): Promise<CannedResponseResponseDto> {
    return this.cannedResponseService.update(id, tenant.id, dto);
  }

  // Deletes a canned response by ID
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteCannedResponse()
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantInfo,
  ): Promise<void> {
    return this.cannedResponseService.delete(id, tenant.id);
  }
}
