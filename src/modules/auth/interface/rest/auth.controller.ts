import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Req, Inject, forwardRef, NotFoundException } from '@nestjs/common';
import { RegisterUseCase } from '../../application/handlers/register.use-case';
import { LoginUseCase } from '../../application/handlers/login.use-case';
import { RefreshTokenUseCase } from '../../application/handlers/refresh-token.use-case';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponse } from '../../../../shared/dto/auth-response.dto';
import { UserResponse } from '../../../../shared/dto/user-response.dto';
import { JwtAuthGuard } from '../../../../shared/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../../../shared/decorators/current-user.decorator';
import { IUserRepository } from '../../../user/infrastructure/persistence/repositories/user.repository';
import { ApiResponse, ApiResponseUtil } from '../../../../shared/dto/api-response.dto';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    @Inject(forwardRef(() => 'IUserRepository'))
    private readonly userRepository: IUserRepository,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<ApiResponse<AuthResponse>> {
    await this.registerUseCase.execute({
      email: dto.email,
      password: dto.password,
      displayName: dto.displayName,
    });

    // Auto login after registration
    const result = await this.loginUseCase.execute({
      email: dto.email,
      password: dto.password,
    });

    const authResponse: AuthResponse = {
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName || undefined,
        avatarUrl: this.apiServiceUrl + (result.user.avatarUrl || undefined),
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
        avatarUrl: result.user.avatarUrl || undefined,
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
        avatarUrl: result.user.avatarUrl || undefined,
      },
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    };

    return ApiResponseUtil.success(authResponse, 'Token refreshed successfully');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getMe(@CurrentUser() user: CurrentUserPayload): Promise<ApiResponse<UserResponse>> {
    const dbUser = await this.userRepository.findById(user.userId);
    if (!dbUser) {
      throw new NotFoundException('User not found');
    }

    const userResponse: UserResponse = {
      id: dbUser.id,
      email: dbUser.email,
      displayName: dbUser.displayName || undefined,
      avatarUrl: this.apiServiceUrl + (dbUser.avatarUrl || undefined),
      isActive: dbUser.isActive,
      lastLoginAt: dbUser.lastLoginAt || undefined,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    };

    return ApiResponseUtil.success(userResponse);
  }
}
