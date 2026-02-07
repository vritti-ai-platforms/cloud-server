import { Body, Controller, Delete, Get, Logger, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserId } from '@vritti/api-sdk';
import { SessionService } from '../../auth/services/session.service';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { UserService } from '../user.service';

/**
 * User Controller
 * Note: This controller provides basic read operations for internal use.
 * User creation/update is handled by Onboarding and Auth modules.
 */
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
  ) {}

  /**
   * Get all users (admin/internal use)
   * GET /users
   */
  @Get()
  @ApiOperation({ summary: 'Retrieve all users (admin/internal use)' })
  @ApiResponse({
    status: 200,
    description: 'List of all users retrieved successfully',
    type: [UserResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' })
  async findAll(): Promise<UserResponseDto[]> {
    this.logger.log('GET /users - Fetching all users');
    return await this.userService.findAll();
  }

  /**
   * Get user by ID
   * GET /users/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a user by ID' })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the user',
    example: 'usr_abc123xyz',
  })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findById(@Param('id') id: string): Promise<UserResponseDto> {
    this.logger.log(`GET /users/${id} - Fetching user by ID`);
    return await this.userService.findById(id);
  }

  /**
   * Update user profile
   * PUT /users/profile
   */
  @Put('profile')
  @ApiOperation({
    summary: 'Update user profile',
    description:
      "Update the authenticated user's profile information including name, phone, profile picture, locale, and timezone.",
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateProfile(@UserId() userId: string, @Body() updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    this.logger.log(`PUT /users/profile - Updating profile for user: ${userId}`);
    return await this.userService.update(userId, updateUserDto);
  }

  /**
   * Delete user account
   * DELETE /users/account
   */
  @Delete('account')
  @ApiOperation({
    summary: 'Delete user account',
    description:
      "Soft delete the authenticated user's account. Sets account status to INACTIVE and invalidates all sessions.",
  })
  @ApiResponse({
    status: 200,
    description: 'Account deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Account successfully deleted' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteAccount(@UserId() userId: string): Promise<{ message: string }> {
    this.logger.log(`DELETE /users/account - Deleting account for user: ${userId}`);

    // Soft delete user account (sets accountStatus to INACTIVE)
    await this.userService.deactivate(userId);

    // Invalidate all sessions for security
    await this.sessionService.invalidateAllUserSessions(userId);

    this.logger.log(`Account deleted and all sessions invalidated for user: ${userId}`);

    return { message: 'Account successfully deleted' };
  }
}
