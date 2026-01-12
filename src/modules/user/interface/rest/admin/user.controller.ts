import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
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
import { DeleteUserUseCase } from '../../../application/handlers/admin/delete-user.use-case';
import { AdminListUsersQueryDto } from '../dto/admin-list-users-query.dto';
import { AdminUpdateUserDto } from '../dto/admin-update-user.dto';
import { AdminCreateUserDto } from '../dto/admin-create-user.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import {
  notFound,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';
import { IUserRepository } from '../../../infrastructure/persistence/repositories/user.repository';
import { Inject } from '@nestjs/common';
import { buildFullUrl } from '../../../../../shared/utils/url.util';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PointTransaction } from '../../../../point/domain/entities/point-transaction.entity';

@Controller('admin/users')
@UseGuards(AdminJwtAuthGuard, AdminPermissionGuard)
export class AdminUserController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly getUserDetailUseCase: GetUserDetailUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly configService: ConfigService,
    @InjectRepository(PointTransaction)
    private readonly pointTransactionRepository: Repository<PointTransaction>,
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
      throw notFound(MessageKeys.USER_NOT_FOUND);
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
            color: ub.badge.color || null,
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
      search: query.search,
      email: query.email,
      displayName: query.displayName,
      status: query.status,
      isActive: query.isActive,
      cursor: query.cursor,
      limit: query.limit || 20,
      sortBy: query.sortBy,
      sortDir: query.sortDir?.toUpperCase() as 'ASC' | 'DESC' | undefined,
    });

    const users = result.data;
    const userIds = users.map((user) => user.id);

    // Prepare exchange/refund statistics from point_transactions for listed users
    const exchangeStatsByUser: Record<
      string,
      {
        exchangeCount: number;
        exchangeAmount: number;
        refundCount: number;
        refundAmount: number;
        giftCount: number;
        giftAmount: number;
        giftRefundCount: number;
        giftRefundAmount: number;
      }
    > = {};

    if (userIds.length > 0) {
      // Use conditional aggregation to calculate all stats in one query (1 row per user)
      const rawStats = await this.pointTransactionRepository
        .createQueryBuilder('pt')
        .select('pt.userId', 'userId')
        .addSelect(
          `SUM(CASE WHEN pt.category = 'point_exchange' THEN 1 ELSE 0 END)`,
          'exchangeCount',
        )
        .addSelect(
          `COALESCE(SUM(CASE WHEN pt.category = 'point_exchange' THEN pt.amount ELSE 0 END), 0)`,
          'exchangeAmount',
        )
        .addSelect(
          `SUM(CASE WHEN pt.category = 'point_exchange_refund' THEN 1 ELSE 0 END)`,
          'refundCount',
        )
        .addSelect(
          `COALESCE(SUM(CASE WHEN pt.category = 'point_exchange_refund' THEN pt.amount ELSE 0 END), 0)`,
          'refundAmount',
        )
        .addSelect(
          `SUM(CASE WHEN pt.category = 'gifticon_redemption' THEN 1 ELSE 0 END)`,
          'giftCount',
        )
        .addSelect(
          `COALESCE(SUM(CASE WHEN pt.category = 'gifticon_redemption' THEN pt.amount ELSE 0 END), 0)`,
          'giftAmount',
        )
        .addSelect(
          `SUM(CASE WHEN pt.category = 'gifticon_redemption_refund' THEN 1 ELSE 0 END)`,
          'giftRefundCount',
        )
        .addSelect(
          `COALESCE(SUM(CASE WHEN pt.category = 'gifticon_redemption_refund' THEN pt.amount ELSE 0 END), 0)`,
          'giftRefundAmount',
        )
        .where('pt.userId IN (:...userIds)', { userIds })
        .andWhere('pt.category IN (:...categories)', {
          categories: [
            'point_exchange',
            'point_exchange_refund',
            'gifticon_redemption',
            'gifticon_redemption_refund',
          ],
        })
        .groupBy('pt.userId')
        .getRawMany();

      // Map results directly using Object.fromEntries (no explicit loop)
      Object.assign(
        exchangeStatsByUser,
        Object.fromEntries(
          (
            rawStats as Array<{
              userId: string;
              exchangeCount: string;
              exchangeAmount: string;
              refundCount: string;
              refundAmount: string;
              giftCount: string;
              giftAmount: string;
              giftRefundCount: string;
              giftRefundAmount: string;
            }>
          ).map((row) => [
            row.userId,
            {
              exchangeCount: Number(row.exchangeCount) || 0,
              exchangeAmount: Number(row.exchangeAmount) || 0,
              refundCount: Number(row.refundCount) || 0,
              refundAmount: Number(row.refundAmount) || 0,
              giftCount: Number(row.giftCount) || 0,
              giftAmount: Number(row.giftAmount) || 0,
              giftRefundCount: Number(row.giftRefundCount) || 0,
              giftRefundAmount: Number(row.giftRefundAmount) || 0,
            },
          ]),
        ),
      );
    }

    return ApiResponseUtil.success({
      data: users.map((user) => {
        const stats = exchangeStatsByUser[user.id] || {
          exchangeCount: 0,
          exchangeAmount: 0,
          refundCount: 0,
          refundAmount: 0,
          giftCount: 0,
          giftAmount: 0,
          giftRefundCount: 0,
          giftRefundAmount: 0,
        };

        return {
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
          registerIp: user.userProfile?.registerIp || null,
          lastLoginIp: user.userProfile?.lastLoginIp || null,
          lastRequestIp: user.userProfile?.lastRequestIp || null,
          exchangeCount: stats.exchangeCount,
          exchangeAmount: stats.exchangeAmount,
          refundCount: stats.refundCount,
          refundAmount: stats.refundAmount,
          giftCount: stats.giftCount,
          giftAmount: stats.giftAmount,
          giftRefundCount: stats.giftRefundCount,
          giftRefundAmount: stats.giftRefundAmount,
          badge: (() => {
            const activeBadge = (user.userBadges || []).find(
              (ub) => ub?.badge && ub.badge.isActive && !ub.badge.deletedAt && ub.active,
            );
            if (!activeBadge) return null;
            return {
              name: activeBadge.badge.name,
              earnedAt: activeBadge.earnedAt,
              iconUrl:
                buildFullUrl(this.apiServiceUrl, activeBadge.badge.iconUrl || null) ||
                null,
              iconName: activeBadge.badge.iconName || null,
              color: activeBadge.badge.color || null,
            };
          })(),
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };
      }),
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
      registerIp: user.userProfile?.registerIp || null,
      lastLoginIp: user.userProfile?.lastLoginIp || null,
      lastRequestIp: user.userProfile?.lastRequestIp || null,
      badge: (() => {
        const activeBadge = (user.userBadges || []).find(
          (ub) => ub?.badge && ub.badge.isActive && !ub.badge.deletedAt && ub.active,
        );
        if (!activeBadge) return null;
        return {
          name: activeBadge.badge.name,
          earnedAt: activeBadge.earnedAt,
          iconUrl:
            buildFullUrl(this.apiServiceUrl, activeBadge.badge.iconUrl || null) || null,
          iconName: activeBadge.badge.iconName || null,
          color: activeBadge.badge.color || null,
        };
      })(),
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
      bio: dto.bio,
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
      throw notFound(MessageKeys.USER_NOT_FOUND);
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
        badge: (() => {
          const activeBadge = (dbUser.userBadges || []).find(
            (ub) => ub?.badge && ub.badge.isActive && !ub.badge.deletedAt && ub.active,
          );
          if (!activeBadge) return null;
          return {
            name: activeBadge.badge.name,
            earnedAt: activeBadge.earnedAt,
            iconUrl:
              buildFullUrl(this.apiServiceUrl, activeBadge.badge.iconUrl || null) || null,
            iconName: activeBadge.badge.iconName || null,
            color: activeBadge.badge.color || null,
          };
        })(),
        createdAt: dbUser.createdAt,
        updatedAt: dbUser.updatedAt,
      },
      'User updated successfully',
    );
  }

  @Delete(':id')
  @RequirePermission('users.update')
  @HttpCode(HttpStatus.OK)
  async softDeleteUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.deleteUserUseCase.execute({
      userId: id,
      adminId: admin.adminId,
    });

    return ApiResponseUtil.success(
      { message: 'User deleted successfully' },
      MessageKeys.USER_DELETED_SUCCESS,
    );
  }
}
