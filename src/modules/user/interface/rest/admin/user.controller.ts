import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import { AdminJwtAuthGuard } from '../../../../admin/infrastructure/guards/admin-jwt-auth.guard';
import { AdminPermissionGuard } from '../../../../admin/infrastructure/guards/admin-permission.guard';
import { RequirePermission } from '../../../../admin/infrastructure/decorators/require-permission.decorator';
import {
  CurrentAdmin,
  CurrentAdminPayload,
} from '../../../../admin/infrastructure/decorators/current-admin.decorator';
import { ListUsersUseCase } from '../../../application/handlers/admin/list-users.use-case';
import { GetUserDetailUseCase } from '../../../application/handlers/admin/get-user-detail.use-case';
import { UpdateUserUseCase } from '../../../application/handlers/admin/update-user.use-case';
import { CreateUserUseCase } from '../../../application/handlers/admin/create-user.use-case';
import { AdminListUsersQueryDto } from '../dto/admin-list-users-query.dto';
import { AdminUpdateUserDto } from '../dto/admin-update-user.dto';
import { AdminCreateUserDto } from '../dto/admin-create-user.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { IUserRepository } from '../../../infrastructure/persistence/repositories/user.repository';
import { Inject } from '@nestjs/common';
import { buildFullUrl } from '../../../../../shared/utils/url.util';
import { ConfigService } from '@nestjs/config';
import { BadgeResponse } from '../../../../../shared/dto/badge-response.dto';

@Controller('admin/users')
@UseGuards(AdminJwtAuthGuard, AdminPermissionGuard)
export class AdminUserController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly getUserDetailUseCase: GetUserDetailUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly createUserUseCase: CreateUserUseCase,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  private mapUserRoles(user: { userRoles?: Array<{ role?: { name: string } }> }): string {
    if (!user.userRoles || user.userRoles.length === 0) {
      return '';
    }
    const roles: string[] = [];
    for (const userRole of user.userRoles) {
      if (userRole?.role) {
        roles.push(userRole.role.name);
      }
    }
    return roles.join(',');
  }

  @Post('create')
  @RequirePermission('users.create')
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Body() dto: AdminCreateUserDto,
  ): Promise<ApiResponse<any>> {
    const user = await this.createUserUseCase.execute({
      email: dto.email,
      password: dto.password,
      displayName: dto.displayName,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      partner: dto.partner !== undefined ? dto.partner : false,
      adminId: admin.adminId,
    });

    // Reload user with relations for response
    const dbUser = await this.userRepository.findById(user.id, [
      'userProfile',
      'userRoles',
      'userRoles.role',
      'userBadges',
      'userBadges.badge',
    ]);

    if (!dbUser) {
      throw new NotFoundException('User not found');
    }

    return ApiResponseUtil.success(
      {
        id: dbUser.id,
        email: dbUser.email,
        displayName: dbUser.displayName || null,
        avatarUrl: buildFullUrl(this.apiServiceUrl, dbUser.avatarUrl || null) || null,
        isActive: dbUser.isActive,
        lastLoginAt: dbUser.lastLoginAt || null,
        roles: this.mapUserRoles(dbUser),
        points: dbUser.userProfile?.points ?? 0,
        bio: dbUser.userProfile?.bio || null,
        phone: dbUser.userProfile?.phone || null,
        birthDate: dbUser.userProfile?.birthDate || null,
        gender: dbUser.userProfile?.gender || null,
        badges: (dbUser.userBadges || [])
          .filter((ub) => ub?.badge && !ub.badge.deletedAt)
          .map((ub) => ({
            id: ub.badge.id,
            name: ub.badge.name,
            description: ub.badge.description || null,
            iconUrl: buildFullUrl(this.apiServiceUrl, ub.badge.iconUrl || null) || null,
            earnedAt: ub.earnedAt,
            active: ub.active,
          })),
        createdAt: dbUser.createdAt,
        updatedAt: dbUser.updatedAt,
      },
      'User created successfully',
    );
  }

  @Get()
  @RequirePermission('users.read')
  @HttpCode(HttpStatus.OK)
  async listUsers(@Query() query: AdminListUsersQueryDto): Promise<ApiResponse<any>> {
    const result = await this.listUsersUseCase.execute({
      email: query.email,
      displayName: query.displayName,
      isActive: query.isActive,
      cursor: query.cursor,
      limit: query.limit || 20,
    });

    return ApiResponseUtil.success({
      data: result.data.map((user) => ({
        id: user.id,
        email: user.email,
        displayName: user.displayName || null,
        avatarUrl: buildFullUrl(this.apiServiceUrl, user.avatarUrl || null) || null,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt || null,
        roles: this.mapUserRoles(user),
        points: user.userProfile?.points ?? 0,
        bio: user.userProfile?.bio || null,
        phone: user.userProfile?.phone || null,
        birthDate: user.userProfile?.birthDate || null,
        gender: user.userProfile?.gender || null,
        badges: (user.userBadges || [])
          .filter((ub) => ub?.badge && !ub.badge.deletedAt)
          .map((ub) => ({
            id: ub.badge.id,
            name: ub.badge.name,
            description: ub.badge.description || null,
            iconUrl: buildFullUrl(this.apiServiceUrl, ub.badge.iconUrl || null) || null,
            earnedAt: ub.earnedAt,
            active: ub.active,
          })),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Get(':id')
  @RequirePermission('users.read')
  @HttpCode(HttpStatus.OK)
  async getUserDetail(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<any>> {
    const user = await this.getUserDetailUseCase.execute({ userId: id });

    return ApiResponseUtil.success({
      id: user.id,
      email: user.email,
      displayName: user.displayName || null,
      avatarUrl: buildFullUrl(this.apiServiceUrl, user.avatarUrl || null) || null,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt || null,
      roles: this.mapUserRoles(user),
      points: user.userProfile?.points ?? 0,
      bio: user.userProfile?.bio || null,
      phone: user.userProfile?.phone || null,
      birthDate: user.userProfile?.birthDate || null,
      gender: user.userProfile?.gender || null,
      badges: (user.userBadges || [])
        .filter((ub) => ub?.badge && !ub.badge.deletedAt)
        .map((ub) => ({
          id: ub.badge.id,
          name: ub.badge.name,
          description: ub.badge.description || null,
          iconUrl: buildFullUrl(this.apiServiceUrl, ub.badge.iconUrl || null) || null,
          earnedAt: ub.earnedAt,
          active: ub.active,
        })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }

  @Put(':id')
  @RequirePermission('users.update')
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Body() dto: AdminUpdateUserDto,
  ): Promise<ApiResponse<any>> {
    const user = await this.updateUserUseCase.execute({
      userId: id,
      adminId: admin.adminId,
      isActive: dto.isActive,
      points: dto.points,
      partner: dto.partner,
    });

    // Reload user with relations for response
    const dbUser = await this.userRepository.findById(user.id, [
      'userProfile',
      'userRoles',
      'userRoles.role',
      'userBadges',
      'userBadges.badge',
    ]);

    if (!dbUser) {
      throw new NotFoundException('User not found');
    }

    return ApiResponseUtil.success(
      {
        id: dbUser.id,
        email: dbUser.email,
        displayName: dbUser.displayName || null,
        avatarUrl: buildFullUrl(this.apiServiceUrl, dbUser.avatarUrl || null) || null,
        isActive: dbUser.isActive,
        lastLoginAt: dbUser.lastLoginAt || null,
        roles: this.mapUserRoles(dbUser),
        points: dbUser.userProfile?.points ?? 0,
        bio: dbUser.userProfile?.bio || null,
        phone: dbUser.userProfile?.phone || null,
        birthDate: dbUser.userProfile?.birthDate || null,
        gender: dbUser.userProfile?.gender || null,
        badges: (dbUser.userBadges || [])
          .filter((ub) => ub?.badge && !ub.badge.deletedAt)
          .map((ub) => ({
            id: ub.badge.id,
            name: ub.badge.name,
            description: ub.badge.description || null,
            iconUrl: buildFullUrl(this.apiServiceUrl, ub.badge.iconUrl || null) || null,
            earnedAt: ub.earnedAt,
            active: ub.active,
          })),
        createdAt: dbUser.createdAt,
        updatedAt: dbUser.updatedAt,
      },
      'User updated successfully',
    );
  }
}
