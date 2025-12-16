import { Controller, Post, Body, HttpCode, HttpStatus, Req, Inject, UseGuards } from '@nestjs/common';
import { RegisterUseCase } from '../../application/handlers/register.use-case';
import { LoginUseCase } from '../../application/handlers/login.use-case';
import { RefreshTokenUseCase } from '../../application/handlers/refresh-token.use-case';
import { LogoutUseCase } from '../../application/handlers/logout.use-case';
import { RequestOtpUseCase } from '../../application/handlers/request-otp.use-case';
import { ResetPasswordUseCase } from '../../application/handlers/reset-password.use-case';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthResponse } from '../../../../shared/dto/auth-response.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../shared/dto/api-response.dto';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../shared/utils/url.util';
import { JwtAuthGuard } from '../../../../shared/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../../../shared/decorators/current-user.decorator';
import { IUserRepository } from '../../../user/infrastructure/persistence/repositories/user.repository';
@Controller('api/auth')
export class AuthController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly requestOtpUseCase: RequestOtpUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto, @Req() req: any): Promise<ApiResponse<AuthResponse>> {
    const ipAddress = req.ip || req.connection?.remoteAddress;

    await this.registerUseCase.execute({
      email: dto.email,
      password: dto.password,
      displayName: dto.displayName,
      bio: dto.bio,
      phone: dto.phone,
      birthDate: dto.birthDate,
      gender: dto.gender,
    });

    // Auto login after registration
    const result = await this.loginUseCase.execute({
      email: dto.email,
      password: dto.password,
      ipAddress,
    });

    const authResponse: AuthResponse = {
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName || undefined,
        avatarUrl: buildFullUrl(this.apiServiceUrl, result.user.avatarUrl),
        bio: result.user.userProfile?.bio || undefined,
        phone: result.user.userProfile?.phone || undefined,
        birthDate: result.user.userProfile?.birthDate || undefined,
        gender: result.user.userProfile?.gender || undefined,
      },
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    };

    return ApiResponseUtil.success(authResponse, 'User registered successfully');
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: any): Promise<ApiResponse<AuthResponse>> {
    const result = await this.loginUseCase.execute({
      email: dto.email,
      password: dto.password,
      deviceInfo: dto.deviceInfo,
      ipAddress: req.ip || req.connection.remoteAddress,
    });

    const authResponse: AuthResponse = {
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName || undefined,
        avatarUrl: buildFullUrl(this.apiServiceUrl, result.user.avatarUrl),
        bio: result.user.userProfile?.bio || undefined,
        phone: result.user.userProfile?.phone || undefined,
        birthDate: result.user.userProfile?.birthDate || undefined,
        gender: result.user.userProfile?.gender || undefined,
      },
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    };

    return ApiResponseUtil.success(authResponse, 'Login successful');
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto): Promise<ApiResponse<AuthResponse>> {
    const result = await this.refreshTokenUseCase.execute({
      refreshToken: dto.refreshToken,
    });

    const authResponse: AuthResponse = {
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName || undefined,
        avatarUrl: buildFullUrl(this.apiServiceUrl, result.user.avatarUrl),
        bio: result.user.userProfile?.bio || undefined,
        phone: result.user.userProfile?.phone || undefined,
        birthDate: result.user.userProfile?.birthDate || undefined,
        gender: result.user.userProfile?.gender || undefined,
      },
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    };

    return ApiResponseUtil.success(authResponse, 'Token refreshed successfully');
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
      'Logged out successfully',
    );
  }

  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Body() dto: RequestOtpDto): Promise<ApiResponse> {
    const result = await this.requestOtpUseCase.execute({
      email: dto.email,
    });

    return ApiResponseUtil.success(
      {
        code: result?.otp || null,
        note: 'For testing purpose, the OTP is sent to the email',
      },
      result?.message || 'OTP sent successfully',
    );
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<ApiResponse<{ message: string }>> {
    const result = await this.resetPasswordUseCase.execute({
      email: dto.email,
      newPassword: dto.newPassword,
      passwordConfirmation: dto.passwordConfirmation,
      verifyCode: dto.verifyCode,
    });

    return ApiResponseUtil.success(
      null,
      result?.message || 'Password reset successfully',
    );
  }
}
