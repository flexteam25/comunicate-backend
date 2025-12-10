import {
  Controller,
  Put,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChangePasswordUseCase } from '../../application/handlers/change-password.use-case';
import { UpdateProfileUseCase } from '../../application/handlers/update-profile.use-case';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserResponse } from '../../../../shared/dto/user-response.dto';
import { JwtAuthGuard } from '../../../../shared/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../shared/decorators/current-user.decorator';
import { ApiResponse, ApiResponseUtil } from '../../../../shared/dto/api-response.dto';
import { UploadService, UploadResult, MulterFile } from '../../../../shared/services/upload';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../shared/utils/url.util';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly uploadService: UploadService,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

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
    });

    const userResponse: UserResponse = {
      id: updatedUser.id,
      email: updatedUser.email,
      displayName: updatedUser.displayName || undefined,
      avatarUrl: buildFullUrl(this.apiServiceUrl, updatedUser.avatarUrl),
      isActive: updatedUser.isActive,
      lastLoginAt: updatedUser.lastLoginAt || undefined,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };

    return ApiResponseUtil.success(userResponse, 'Profile updated successfully');
  }

  @Post('avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/i }),
        ],
      }),
    )
    file: MulterFile,
  ): Promise<ApiResponse<UploadResult>> {
    const result = await this.uploadService.uploadAvatar(file, user.userId);

    // Update user profile with new avatar URL
    await this.updateProfileUseCase.execute({
      userId: user.userId,
      avatarUrl: result.url,
    });

    return ApiResponseUtil.success(result, 'Avatar uploaded successfully');
  }
}
