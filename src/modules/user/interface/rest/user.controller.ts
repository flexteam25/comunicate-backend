import { Controller, Put, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ChangePasswordUseCase } from '../../application/handlers/change-password.use-case';
import { UpdateProfileUseCase } from '../../application/handlers/update-profile.use-case';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserResponse } from '../../../../shared/dto/user-response.dto';
import { JwtAuthGuard } from '../../../../shared/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../../../shared/decorators/current-user.decorator';
import { ApiResponse, ApiResponseUtil } from '../../../../shared/dto/api-response.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
  ) {}

  @Put('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangePasswordDto,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.changePasswordUseCase.execute({
      userId: user.userId,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
      passwordConfirmation: dto.passwordConfirmation,
    });

    return ApiResponseUtil.success(
      { message: 'Password changed successfully' },
      'Password changed successfully',
    );
  }

  @Put('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateProfileDto,
  ): Promise<ApiResponse<UserResponse>> {
    const updatedUser = await this.updateProfileUseCase.execute({
      userId: user.userId,
      displayName: dto.displayName,
      avatarUrl: dto.avatarUrl,
    });

    const userResponse: UserResponse = {
      id: updatedUser.id,
      email: updatedUser.email,
      displayName: updatedUser.displayName || undefined,
      avatarUrl: updatedUser.avatarUrl || undefined,
      isActive: updatedUser.isActive,
      lastLoginAt: updatedUser.lastLoginAt || undefined,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };

    return ApiResponseUtil.success(userResponse, 'Profile updated successfully');
  }
}
