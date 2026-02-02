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
import { UserId } from '@vritti/api-sdk';
import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CompanyMemberService } from './company-member.service';
import { CompanyMemberResponseDto } from './dto';

class AssignRoleDto {
  @ApiProperty({ description: 'Role ID to assign' })
  @IsString()
  @IsUUID('4')
  roleId: string;
}

@ApiTags('Company Members')
@ApiBearerAuth()
@Controller('companies/:companyId/members')
export class CompanyMemberController {
  private readonly logger = new Logger(CompanyMemberController.name);

  constructor(private readonly companyMemberService: CompanyMemberService) {}

  @Get()
  @ApiOperation({ summary: 'List all members of a company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, type: [CompanyMemberResponseDto] })
  async findAll(@Param('companyId') companyId: string): Promise<CompanyMemberResponseDto[]> {
    this.logger.log(`GET /companies/${companyId}/members`);
    return this.companyMemberService.findByCompanyId(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get member details' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiResponse({ status: 200, type: CompanyMemberResponseDto })
  async findById(@Param('id') id: string): Promise<CompanyMemberResponseDto> {
    return this.companyMemberService.findById(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiResponse({ status: 204, description: 'Member removed' })
  async remove(@Param('id') id: string, @UserId() userId: string): Promise<void> {
    this.logger.log(`DELETE /members/${id}`);
    return this.companyMemberService.removeMember(id, userId);
  }

  @Post(':id/roles')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign a role to a member' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiBody({ type: AssignRoleDto })
  @ApiResponse({ status: 200, description: 'Role assigned' })
  async assignRole(
    @Param('id') id: string,
    @Body() dto: AssignRoleDto,
    @UserId() userId: string,
  ): Promise<void> {
    this.logger.log(`POST /members/${id}/roles - Assigning role ${dto.roleId}`);
    return this.companyMemberService.assignRole(id, dto.roleId, userId);
  }

  @Delete(':id/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a role from a member' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiParam({ name: 'roleId', description: 'Role ID to remove' })
  @ApiResponse({ status: 204, description: 'Role removed' })
  async removeRole(
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @UserId() userId: string,
  ): Promise<void> {
    this.logger.log(`DELETE /members/${id}/roles/${roleId}`);
    return this.companyMemberService.removeRole(id, roleId, userId);
  }
}
