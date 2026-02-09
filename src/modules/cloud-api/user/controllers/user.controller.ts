import { Body, Controller, Delete, Get, Logger, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserId } from '@vritti/api-sdk';
import { SessionService } from '../../auth/root/services/session.service';
import { ApiFindAllUsers, ApiFindUserById, ApiUpdateProfile, ApiDeleteAccount } from '../docs/user.docs';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { UserService } from '../services/user.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
  ) {}

  // Retrieves all users in the system
  @Get()
  @ApiFindAllUsers()
  async findAll(): Promise<UserResponseDto[]> {
    this.logger.log('GET /users - Fetching all users');
    return await this.userService.findAll();
  }

  // Retrieves a single user by their unique identifier
  @Get(':id')
  @ApiFindUserById()
  async findById(@Param('id') id: string): Promise<UserResponseDto> {
    this.logger.log(`GET /users/${id} - Fetching user by ID`);
    return await this.userService.findById(id);
  }

  // Updates the authenticated user's profile information
  @Put('profile')
  @ApiUpdateProfile()
  async updateProfile(@UserId() userId: string, @Body() updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    this.logger.log(`PUT /users/profile - Updating profile for user: ${userId}`);
    return await this.userService.update(userId, updateUserDto);
  }

  // Deactivates the authenticated user's account and invalidates all sessions
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
