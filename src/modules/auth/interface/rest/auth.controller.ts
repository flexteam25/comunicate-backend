import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { RegisterUseCase } from '../../application/handlers/register.use-case';
import { LoginUseCase } from '../../application/handlers/login.use-case';
import { RefreshTokenUseCase } from '../../application/handlers/refresh-token.use-case';
import { LogoutUseCase } from '../../application/handlers/logout.use-case';
import { RequestOtpUseCase } from '../../application/handlers/request-otp.use-case';
import { RequestOtpPhoneUseCase } from '../../application/handlers/request-otp-phone.use-case';
import { VerifyOtpUseCase } from '../../application/handlers/verify-otp.use-case';
import { VerifyOtpForgotPasswordUseCase } from '../../application/handlers/verify-otp-forgot-password.use-case';
import { ResetPasswordUseCase } from '../../application/handlers/reset-password.use-case';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { RequestOtpPhoneDto } from './dto/request-otp-phone.dto';
import { VerifyOtpForgotPasswordDto } from './dto/verify-otp-forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthResponse } from '../../../../shared/dto/auth-response.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../shared/dto/api-response.dto';
import { MessageKeys } from '../../../../shared/exceptions/exception-helpers';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../shared/utils/url.util';
import { JwtAuthGuard } from '../../../../shared/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../shared/decorators/current-user.decorator';
import { IUserRepository } from '../../../user/infrastructure/persistence/repositories/user.repository';
import { Request } from 'express';
import { getClientIp } from '../../../../shared/utils/request.util';
@Controller('api/auth')
export class AuthController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly requestOtpUseCase: RequestOtpUseCase,
    private readonly requestOtpPhoneUseCase: RequestOtpPhoneUseCase,
    private readonly verifyOtpUseCase: VerifyOtpUseCase,
    private readonly verifyOtpForgotPasswordUseCase: VerifyOtpForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  private mapUserRoles(user: { userRoles?: Array<{ role?: { name: string } }> }): string {
    const roles: string[] = [];
    if (user.userRoles) {
      for (const userRole of user.userRoles) {
        if (userRole?.role?.name) {
          roles.push(userRole.role.name);
        }
      }
    }
    return roles.join(',');
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
  ): Promise<ApiResponse<AuthResponse>> {
    const ipAddress = getClientIp(req);

    await this.registerUseCase.execute({
      email: dto.email,
      password: dto.password,
      displayName: dto.displayName,
      bio: dto.bio,
      token: dto.token,
      birthDate: dto.birthDate,
      gender: dto.gender,
      partner: dto.partner,
      ipAddress,
    });

    // Auto login after registration
    const result = await this.loginUseCase.execute({
      email: dto.email,
      password: dto.password,
      ipAddress,
    });

    // Reload user with roles for response
    const dbUser = await this.userRepository.findById(result.user.id, [
      'userRoles',
      'userRoles.role',
      'userProfile',
    ]);

    const authResponse: AuthResponse = {
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: dbUser?.displayName || undefined,
        avatarUrl: buildFullUrl(this.apiServiceUrl, dbUser?.avatarUrl),
        roles: dbUser ? this.mapUserRoles(dbUser) : '',
        bio: dbUser?.userProfile?.bio || undefined,
        phone: dbUser?.userProfile?.phone || undefined,
        birthDate: dbUser?.userProfile?.birthDate || undefined,
        gender: dbUser?.userProfile?.gender || undefined,
      },
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    };

    return ApiResponseUtil.success(authResponse, MessageKeys.USER_REGISTERED_SUCCESS);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<ApiResponse<AuthResponse>> {
    const ipAddress = getClientIp(req);

    const result = await this.loginUseCase.execute({
      email: dto.email,
      password: dto.password,
      deviceInfo: dto.deviceInfo,
      ipAddress,
    });

    // Reload user with roles for response
    const dbUser = await this.userRepository.findById(result.user.id, [
      'userRoles',
      'userRoles.role',
      'userProfile',
    ]);

    const authResponse: AuthResponse = {
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: dbUser?.displayName || undefined,
        avatarUrl: buildFullUrl(this.apiServiceUrl, dbUser?.avatarUrl),
        roles: dbUser ? this.mapUserRoles(dbUser) : '',
        bio: dbUser?.userProfile?.bio || undefined,
        phone: dbUser?.userProfile?.phone || undefined,
        birthDate: dbUser?.userProfile?.birthDate || undefined,
        gender: dbUser?.userProfile?.gender || undefined,
        points: dbUser?.userProfile?.points || 0,
      },
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    };

    return ApiResponseUtil.success(authResponse, MessageKeys.LOGIN_SUCCESS);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<ApiResponse<{ token: string }>> {
    const result = await this.verifyOtpUseCase.execute({
      phone: dto.phone,
      otp: dto.otp,
    });

    return ApiResponseUtil.success(result, MessageKeys.OTP_VERIFIED_SUCCESS);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto): Promise<ApiResponse<AuthResponse>> {
    const result = await this.refreshTokenUseCase.execute({
      refreshToken: dto.refreshToken,
    });

    // Reload user with roles for response
    const dbUser = await this.userRepository.findById(result.user.id, [
      'userRoles',
      'userRoles.role',
      'userProfile',
    ]);

    const authResponse: AuthResponse = {
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: dbUser?.displayName || undefined,
        avatarUrl: buildFullUrl(this.apiServiceUrl, dbUser?.avatarUrl),
        roles: dbUser ? this.mapUserRoles(dbUser) : '',
        bio: dbUser?.userProfile?.bio || undefined,
        phone: dbUser?.userProfile?.phone || undefined,
        birthDate: dbUser?.userProfile?.birthDate || undefined,
        gender: dbUser?.userProfile?.gender || undefined,
        points: dbUser?.userProfile?.points || 0,
      },
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    };

    return ApiResponseUtil.success(authResponse, MessageKeys.TOKEN_REFRESHED_SUCCESS);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.logoutUseCase.execute({
      tokenId: user.tokenId,
    });

    return ApiResponseUtil.success(
      { message: 'Logged out successfully' },
      MessageKeys.LOGOUT_SUCCESS,
    );
  }

  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Body() dto: RequestOtpDto): Promise<ApiResponse> {
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
        result?.message || MessageKeys.OTP_GENERATED_SUCCESS,
      );
    }

    return ApiResponseUtil.success(null, result?.message || MessageKeys.OTP_SENT_SUCCESS);
  }

  @Post('request-otp-phone')
  @HttpCode(HttpStatus.OK)
  async requestOtpPhone(
    @Body() dto: RequestOtpPhoneDto,
    @Req() req: Request,
  ): Promise<ApiResponse<{ message: string; otp?: string; expiresAt?: string }>> {
    const ipAddress = getClientIp(req);

    const result = await this.requestOtpPhoneUseCase.execute({
      phone: dto.phone,
      ipAddress,
    });

    const responseData: { message: string; otp?: string; expiresAt?: string } = {
      message: result.message,
      expiresAt: result.expiresAt,
    };

    // Include OTP in response if test mode
    if (result.otp) {
      responseData.otp = result.otp;
    }

    // Use appropriate message key based on test mode
    const messageKey = result.otp
      ? MessageKeys.OTP_GENERATED_TO_PHONE_SUCCESS
      : MessageKeys.OTP_SENT_TO_PHONE_SUCCESS;

    return ApiResponseUtil.success(responseData, messageKey);
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
    @Body() dto: ResetPasswordDto,
  ): Promise<ApiResponse<{ message: string }>> {
    const result = await this.resetPasswordUseCase.execute({
      token: dto.token,
      newPassword: dto.newPassword,
      passwordConfirmation: dto.passwordConfirmation,
    });

    return ApiResponseUtil.success(
      null,
      result?.message || 'Password reset successfully',
    );
  }
}
