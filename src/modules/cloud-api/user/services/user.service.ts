import { Injectable, Logger } from '@nestjs/common';
import { ConflictException, NotFoundException } from '@vritti/api-sdk';
import type { User } from '@/db/schema';
import type { CreateUserDto } from '../dto/request/create-user.dto';
import type { UpdateUserDto } from '../dto/request/update-user.dto';
import { UserDto } from '../dto/entity/user.dto';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly userRepository: UserRepository) {}

  // Creates a new user with optional password hash and email uniqueness check
  async create(
    createUserDto: CreateUserDto,
    passwordHash?: string,
    skipEmailCheck = false,
  ): Promise<UserDto> {
    // Validate email uniqueness (skip if caller has already verified)
    if (!skipEmailCheck) {
      const existingUser = await this.userRepository.findByEmail(createUserDto.email);
      if (existingUser) {
        throw new ConflictException({
          label: 'Email Taken',
          detail: 'An account with this email address already exists. Please use a different email or log in to your existing account.',
          errors: [{ field: 'email', message: 'Already registered' }],
        });
      }
    }

    // Create user
    const user = await this.userRepository.create({
      ...createUserDto,
      passwordHash,
    });

    this.logger.log(`Created user: ${user.email} (${user.id})`);

    return UserDto.from(user);
  }

  // Retrieves all users as response DTOs
  async findAll(): Promise<UserDto[]> {
    const users = await this.userRepository.findAll();
    return users.map((user) => UserDto.from(user));
  }

  // Finds a user by ID; throws NotFoundException if not found
  async findById(id: string): Promise<UserDto> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException({
        label: 'User Not Found',
        detail: "We couldn't find the user you're looking for. Please check the user ID and try again.",
      });
    }

    return UserDto.from(user);
  }

  // Finds a user by email address
  async findByEmail(email: string): Promise<User | undefined> {
    return this.userRepository.findByEmail(email);
  }

  // Checks email availability without fetching the full user record
  async emailExists(email: string): Promise<boolean> {
    return this.userRepository.existsByEmail(email);
  }

  // Finds a user by phone number
  async findByPhone(phone: string): Promise<User | undefined> {
    return this.userRepository.findByPhone(phone);
  }

  // Updates user profile fields; throws NotFoundException if not found
  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserDto> {
    // Check if user exists
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new NotFoundException({
        label: 'User Not Found',
        detail: "We couldn't find the user you're trying to update. Please check the user ID and try again.",
      });
    }

    // Update user
    const user = await this.userRepository.update(id, updateUserDto);

    this.logger.log(`Updated user: ${user.email} (${user.id})`);

    return UserDto.from(user);
  }

  // Records the current timestamp as the user's last login
  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.updateLastLogin(id);
    this.logger.debug(`Updated last login for user: ${id}`);
  }

  // Marks the user's email as verified
  async markEmailVerified(id: string): Promise<UserDto> {
    const user = await this.userRepository.markEmailVerified(id);
    this.logger.log(`Marked email verified for user: ${user.email} (${user.id})`);
    return UserDto.from(user);
  }

  // Marks the user's phone as verified with the given number
  async markPhoneVerified(id: string, phone: string, phoneCountry: string): Promise<UserDto> {
    const user = await this.userRepository.markPhoneVerified(id, phone, phoneCountry);
    this.logger.log(`Marked phone verified for user: ${user.email} (${user.id})`);
    return UserDto.from(user);
  }

  // Sets password hash and advances onboarding (for OAuth users setting password)
  async setPasswordHash(id: string, passwordHash: string): Promise<UserDto> {
    const user = await this.userRepository.setPasswordHash(id, passwordHash);
    this.logger.log(`Set password for user: ${user.email} (${user.id})`);
    return UserDto.from(user);
  }

  // Marks phone as verified and completes onboarding, skipping MFA
  async completeOnboarding(id: string, phone: string, phoneCountry?: string): Promise<UserDto> {
    const user = await this.userRepository.completeOnboarding(id, phone, phoneCountry);
    this.logger.log(`Completed onboarding for user: ${user.email} (${user.id})`);
    return UserDto.from(user);
  }

  // Marks phone as verified and advances to MFA setup step
  async markPhoneVerifiedAndAdvanceToMfa(id: string, phone: string, phoneCountry?: string): Promise<UserDto> {
    const user = await this.userRepository.markPhoneVerifiedAndAdvanceToMfa(id, phone, phoneCountry);
    this.logger.log(`Marked phone verified and advanced to MFA for user: ${user.email} (${user.id})`);
    return UserDto.from(user);
  }

  // Permanently deletes a user and all related data
  async delete(id: string): Promise<void> {
    await this.userRepository.hardDelete(id);
    this.logger.log(`Deleted user: ${id}`);
  }

  // Soft deletes a user account; throws NotFoundException if not found
  async deactivate(id: string): Promise<UserDto> {
    // Check if user exists
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new NotFoundException({
        label: 'User Not Found',
        detail: "We couldn't find the user you're trying to deactivate. Please check the user ID and try again.",
      });
    }

    const user = await this.userRepository.softDelete(id);

    this.logger.log(`Deactivated user: ${user.email} (${user.id})`);

    return UserDto.from(user);
  }
}
