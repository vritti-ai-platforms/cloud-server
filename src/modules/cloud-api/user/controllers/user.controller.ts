import { Body, Controller, Delete, Get, Logger, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserId } from '@vritti/api-sdk';
import { SessionService } from '../../auth/services/session.service';
import { ApiFindAllUsers, ApiFindUserById, ApiUpdateProfile, ApiDeleteAccount } from '../docs/user.docs';
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
  @ApiFindAllUsers()
  async findAll(): Promise<UserResponseDto[]> {
    this.logger.log('GET /users - Fetching all users');
    return await this.userService.findAll();
  }

  /**
   * Get user by ID
   * GET /users/:id
   */
  @Get(':id')
  @ApiFindUserById()
  async findById(@Param('id') id: string): Promise<UserResponseDto> {
    this.logger.log(`GET /users/${id} - Fetching user by ID`);
    return await this.userService.findById(id);
  }

  /**
   * Update user profile
   * PUT /users/profile
   */
  @Put('profile')
  @ApiUpdateProfile()
  async updateProfile(@UserId() userId: string, @Body() updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    this.logger.log(`PUT /users/profile - Updating profile for user: ${userId}`);
    return await this.userService.update(userId, updateUserDto);
  }

  /**
   * Delete user account
   * DELETE /users/account
   */
  @Delete('account')
  @ApiDeleteAccount()
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
