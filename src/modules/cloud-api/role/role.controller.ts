import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { Public, UserId } from '@vritti/api-sdk';
import { RoleService } from './role.service';
import { CreateRoleDto, UpdateRoleDto, RoleResponseDto } from './dto';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('companies/:companyId/roles')
export class RoleController {
  private readonly logger = new Logger(RoleController.name);

  constructor(private readonly roleService: RoleService) {}

  @Get()
  @ApiOperation({ summary: 'List all roles in a company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, type: [RoleResponseDto] })
  async findAll(@Param('companyId') companyId: string): Promise<RoleResponseDto[]> {
    this.logger.log(`GET /companies/${companyId}/roles`);
    return this.roleService.findAll(companyId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a custom role' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiBody({ type: CreateRoleDto })
  @ApiResponse({ status: 201, type: RoleResponseDto })
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateRoleDto,
    @UserId() userId: string,
  ): Promise<RoleResponseDto> {
    this.logger.log(`POST /companies/${companyId}/roles - Creating role '${dto.name}'`);
    return this.roleService.create(companyId, dto, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role details with permissions' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 200, type: RoleResponseDto })
  async findById(@Param('id') id: string): Promise<RoleResponseDto> {
    return this.roleService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a role' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiBody({ type: UpdateRoleDto })
  @ApiResponse({ status: 200, type: RoleResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @UserId() userId: string,
  ): Promise<RoleResponseDto> {
    this.logger.log(`PATCH /roles/${id}`);
    return this.roleService.update(id, dto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a custom role' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 204, description: 'Role deleted' })
  async delete(@Param('id') id: string, @UserId() userId: string): Promise<void> {
    this.logger.log(`DELETE /roles/${id}`);
    return this.roleService.delete(id, userId);
  }
}

@ApiTags('Permissions')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all available permissions' })
  @ApiResponse({
    status: 200,
    description: 'List of all permission codes and their descriptions',
  })
  getPermissions() {
    return this.roleService.getAvailablePermissions();
  }
}
