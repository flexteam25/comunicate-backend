import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { getClientIp } from '../../../../shared/utils/request.util';
import { LoginUseCase } from '../../application/handlers/login.use-case';
import { RefreshTokenUseCase } from '../../application/handlers/refresh-token.use-case';
import { LogoutUseCase } from '../../application/handlers/logout.use-case';
import { RequestOtpUseCase } from '../../application/handlers/request-otp.use-case';
import { VerifyOtpForgotPasswordUseCase } from '../../application/handlers/verify-otp-forgot-password.use-case';
import { ResetPasswordUseCase } from '../../application/handlers/reset-password.use-case';
import { ChangePasswordUseCase } from '../../application/handlers/change-password.use-case';
import { UpdateProfileUseCase } from '../../application/handlers/update-profile.use-case';
import { GetMeUseCase } from '../../application/handlers/get-me.use-case';
import { CreateAdminUseCase } from '../../application/handlers/create-admin.use-case';
import { AdminLoginDto } from './dto/login.dto';
import { AdminRefreshTokenDto } from './dto/refresh-token.dto';
import { AdminRequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpForgotPasswordDto } from './dto/verify-otp-forgot-password.dto';
import { AdminResetPasswordDto } from './dto/reset-password.dto';
import { AdminChangePasswordDto } from './dto/change-password.dto';
import { AdminUpdateProfileDto } from './dto/update-profile.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../shared/dto/api-response.dto';
import { AdminJwtAuthGuard } from '../../infrastructure/guards/admin-jwt-auth.guard';
import { AdminPermissionGuard } from '../../infrastructure/guards/admin-permission.guard';
import {
  CurrentAdmin,
  CurrentAdminPayload,
} from '../../infrastructure/decorators/current-admin.decorator';
import { RequirePermission } from '../../infrastructure/decorators/require-permission.decorator';
import { UploadService, MulterFile } from '../../../../shared/services/upload';
import { buildFullUrl } from '../../../../shared/utils/url.util';

interface AdminAuthResponse {
  admin: {
    id: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
    isSuperAdmin: boolean;
    roles: string;
  };
  accessToken: string;
  refreshToken: string;
}

interface AdminResponse {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  lastLoginAt?: Date;
  roles: string;
  createdAt: Date;
  updatedAt: Date;
}

@Controller('admin/auth')
export class AdminController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly requestOtpUseCase: RequestOtpUseCase,
    private readonly verifyOtpForgotPasswordUseCase: VerifyOtpForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly getMeUseCase: GetMeUseCase,
    private readonly createAdminUseCase: CreateAdminUseCase,
    private readonly uploadService: UploadService,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  private mapAdminRoles(admin: {
    adminRoles?: Array<{ role?: { name: string } }>;
  }): string {
    const roles: string[] = [];
    if (admin.adminRoles) {
      for (const adminRole of admin.adminRoles) {
        if (adminRole?.role?.name) {
          roles.push(adminRole.role.name);
        }
      }
    }
    return roles.join(',');
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: AdminLoginDto,
    @Req() req: Request,
  ): Promise<ApiResponse<AdminAuthResponse>> {
    const ipAddress = getClientIp(req);

    const result = await this.loginUseCase.execute({
      email: dto.email,
      password: dto.password,
      deviceInfo: dto.deviceInfo,
      ipAddress,
    });

    // Reload admin with roles for response
    const adminData = await this.getMeUseCase.execute(result.admin.id);

    const authResponse: AdminAuthResponse = {
      admin: {
        id: result.admin.id,
        email: result.admin.email,
        displayName: adminData.displayName || undefined,
        avatarUrl: buildFullUrl(this.apiServiceUrl, adminData.avatarUrl),
        isSuperAdmin: adminData.isSuperAdmin,
        roles: this.mapAdminRoles(adminData),
      },
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    };

    return ApiResponseUtil.success(authResponse, 'Login successful');
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: AdminRefreshTokenDto,
  ): Promise<ApiResponse<AdminAuthResponse>> {
    const result = await this.refreshTokenUseCase.execute({
      refreshToken: dto.refreshToken,
    });

    // Reload admin with roles for response
    const adminData = await this.getMeUseCase.execute(result.admin.id);

    const authResponse: AdminAuthResponse = {
      admin: {
        id: result.admin.id,
        email: result.admin.email,
        displayName: adminData.displayName || undefined,
        avatarUrl: buildFullUrl(this.apiServiceUrl, adminData.avatarUrl),
        isSuperAdmin: adminData.isSuperAdmin,
        roles: this.mapAdminRoles(adminData),
      },
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    };

    return ApiResponseUtil.success(authResponse, 'Token refreshed successfully');
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminJwtAuthGuard)
  async logout(
    @CurrentAdmin() admin: CurrentAdminPayload,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.logoutUseCase.execute({
      tokenId: admin.tokenId,
    });

    return ApiResponseUtil.success({ message: 'Logout successful' }, 'Logout successful');
  }

  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Body() dto: AdminRequestOtpDto): Promise<ApiResponse> {
    const result = await this.requestOtpUseCase.execute({
      email: dto.email,
    });

    const isTestMail =
      this.configService.get<string>('TEST_MAIL')?.toLowerCase() === 'true';

    if (isTestMail) {
      return ApiResponseUtil.success(
        {
          code: result.otp || null,
          note: 'Testing: OTP is returned in response instead of sending email',
        },
        result?.message || 'OTP generated successfully',
      );
    }

    return ApiResponseUtil.success(null, result?.message || 'OTP sent successfully');
  }

  @Post('verify-otp-forgot-password')
  @HttpCode(HttpStatus.OK)
  async verifyOtpForgotPassword(
    @Body() dto: VerifyOtpForgotPasswordDto,
  ): Promise<ApiResponse<{ token: string }>> {
    const result = await this.verifyOtpForgotPasswordUseCase.execute({
      email: dto.email,
      verifyCode: dto.verifyCode,
    });

    return ApiResponseUtil.success(
      { token: result.token },
      'OTP verified successfully. Use the token to reset your password.',
    );
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: AdminResetPasswordDto,
  ): Promise<ApiResponse<{ message: string }>> {
    const result = await this.resetPasswordUseCase.execute({
      token: dto.token,
      newPassword: dto.newPassword,
      passwordConfirmation: dto.passwordConfirmation,
    });

    return ApiResponseUtil.success({ message: result.message }, result.message);
  }

  @Put('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminJwtAuthGuard)
  async changePassword(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Body() dto: AdminChangePasswordDto,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.changePasswordUseCase.execute({
      adminId: admin.adminId,
      tokenId: admin.tokenId,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
      passwordConfirmation: dto.passwordConfirmation,
      logoutAll: dto.logoutAll,
    });

    return ApiResponseUtil.success(
      { message: 'Password changed successfully' },
      'Password changed successfully',
    );
  }

  @Put('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminJwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  async updateProfile(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Body() dto: AdminUpdateProfileDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }), // 20MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/i }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: MulterFile,
  ): Promise<ApiResponse<AdminResponse>> {
    let avatarUrl: string | undefined;

    // Upload avatar if provided
    if (file) {
      const uploadResult = await this.uploadService.uploadAvatar(file, admin.adminId);
      // Save relative path to database, not full URL
      avatarUrl = uploadResult.relativePath;
    }

    // Update profile with displayName and/or avatarUrl
    await this.updateProfileUseCase.execute({
      adminId: admin.adminId,
      displayName: dto.displayName,
      avatarUrl,
    });

    // Reload admin with relations for response
    const adminData = await this.getMeUseCase.execute(admin.adminId);

    const adminResponse: AdminResponse = {
      id: adminData.id,
      email: adminData.email,
      displayName: adminData.displayName || undefined,
      avatarUrl: buildFullUrl(this.apiServiceUrl, adminData.avatarUrl),
      isSuperAdmin: adminData.isSuperAdmin,
      isActive: adminData.isActive,
      lastLoginAt: adminData.lastLoginAt,
      roles: this.mapAdminRoles(adminData),
      createdAt: adminData.createdAt,
      updatedAt: adminData.updatedAt,
    };

    return ApiResponseUtil.success(adminResponse, 'Profile updated successfully');
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminJwtAuthGuard)
  async getMe(
    @CurrentAdmin() admin: CurrentAdminPayload,
  ): Promise<ApiResponse<AdminResponse>> {
    const adminData = await this.getMeUseCase.execute(admin.adminId);

    const adminResponse: AdminResponse = {
      id: adminData.id,
      email: adminData.email,
      displayName: adminData.displayName || undefined,
      avatarUrl: buildFullUrl(this.apiServiceUrl, adminData.avatarUrl),
      isSuperAdmin: adminData.isSuperAdmin,
      isActive: adminData.isActive,
      lastLoginAt: adminData.lastLoginAt,
      roles: this.mapAdminRoles(adminData),
      createdAt: adminData.createdAt,
      updatedAt: adminData.updatedAt,
    };

    return ApiResponseUtil.success(adminResponse, 'Admin retrieved successfully');
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AdminJwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('admin.create')
  async createAdmin(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Body() dto: CreateAdminDto,
  ): Promise<ApiResponse<AdminResponse>> {
    const newAdmin = await this.createAdminUseCase.execute({
      creatorAdminId: admin.adminId,
      email: dto.email,
      password: dto.password,
      displayName: dto.displayName,
      permissionIds: dto.permissionIds,
    });

    // Reload admin with relations for response
    const adminData = await this.getMeUseCase.execute(newAdmin.id);

    const adminResponse: AdminResponse = {
      id: adminData.id,
      email: adminData.email,
      displayName: adminData.displayName || undefined,
      avatarUrl: buildFullUrl(this.apiServiceUrl, adminData.avatarUrl),
      isSuperAdmin: adminData.isSuperAdmin,
      isActive: adminData.isActive,
      lastLoginAt: adminData.lastLoginAt,
      roles: this.mapAdminRoles(adminData),
      createdAt: adminData.createdAt,
      updatedAt: adminData.updatedAt,
    };

    return ApiResponseUtil.success(adminResponse, 'Admin created successfully');
  }
}
