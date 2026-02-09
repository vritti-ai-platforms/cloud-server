import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';

export function ApiFindAllUsers() {
  return applyDecorators(
    ApiOperation({ summary: 'Retrieve all users (admin/internal use)' }),
    ApiResponse({
      status: 200,
      description: 'List of all users retrieved successfully',
      type: [UserResponseDto],
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' }),
  );
}

export function ApiFindUserById() {
  return applyDecorators(
    ApiOperation({ summary: 'Retrieve a user by ID' }),
    ApiParam({
      name: 'id',
      description: 'Unique identifier of the user',
      example: 'usr_abc123xyz',
    }),
    ApiResponse({
      status: 200,
      description: 'User retrieved successfully',
      type: UserResponseDto,
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' }),
    ApiResponse({ status: 404, description: 'User not found' }),
  );
}

export function ApiUpdateProfile() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update user profile',
      description:
        "Update the authenticated user's profile information including name, phone, profile picture, locale, and timezone.",
    }),
    ApiBody({ type: UpdateUserDto }),
    ApiResponse({
      status: 200,
      description: 'Profile updated successfully',
      type: UserResponseDto,
    }),
    ApiResponse({ status: 400, description: 'Invalid input data' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' }),
    ApiResponse({ status: 404, description: 'User not found' }),
  );
}

export function ApiDeleteAccount() {
  return applyDecorators(
    ApiOperation({
      summary: 'Delete user account',
      description:
        "Soft delete the authenticated user's account. Sets account status to INACTIVE and invalidates all sessions.",
    }),
    ApiResponse({
      status: 200,
      description: 'Account deleted successfully',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Account successfully deleted' },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' }),
    ApiResponse({ status: 404, description: 'User not found' }),
  );
}
