import {
  Controller,
  Put,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  NotFoundException,
  BadRequestException,
  Get,
  Inject,
  Post,
  Delete,
  Param,
  Query,
  ParseUUIDPipe,
  Req,
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
import { UploadService, MulterFile } from '../../../../shared/services/upload';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../shared/utils/url.util';
import { normalizePhone } from '../../../../shared/utils/phone.util';
import { IUserRepository } from '../../infrastructure/persistence/repositories/user.repository';
import { IBadgeRepository } from '../../../badge/infrastructure/persistence/repositories/badge.repository';
import { BadgeResponse } from '../../../../shared/dto/badge-response.dto';
import { BadgeType } from '../../../badge/domain/entities/badge.entity';
import { AddFavoriteSiteUseCase } from '../../application/handlers/add-favorite-site.use-case';
import { RemoveFavoriteSiteUseCase } from '../../application/handlers/remove-favorite-site.use-case';
import { ListFavoriteSitesUseCase } from '../../application/handlers/list-favorite-sites.use-case';
import { GetActivityUseCase } from '../../application/handlers/get-activity.use-case';
import { SiteResponse } from '../../../site/interface/rest/dto/site-response.dto';
import { Site } from '../../../site/domain/entities/site.entity';
import { Request } from 'express';
import { getClientIp } from '../../../../shared/utils/request.util';

@Controller('api')
@UseGuards(JwtAuthGuard)
export class UserController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly uploadService: UploadService,
    private readonly configService: ConfigService,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IBadgeRepository')
    private readonly badgeRepository: IBadgeRepository,
    private readonly addFavoriteSiteUseCase: AddFavoriteSiteUseCase,
    private readonly removeFavoriteSiteUseCase: RemoveFavoriteSiteUseCase,
    private readonly listFavoriteSitesUseCase: ListFavoriteSitesUseCase,
    private readonly getActivityUseCase: GetActivityUseCase,
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

  @Post('favorite-sites')
  @HttpCode(HttpStatus.CREATED)
  async addFavoriteSite(
    @CurrentUser() user: CurrentUserPayload,
    @Body('siteId', new ParseUUIDPipe()) siteId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.addFavoriteSiteUseCase.execute({
      userId: user.userId,
      siteId,
    });

    return ApiResponseUtil.success(
      { message: 'Added to favorites' },
      'Added to favorites',
    );
  }

  @Delete('favorite-sites/:siteId')
  @HttpCode(HttpStatus.OK)
  async removeFavoriteSite(
    @CurrentUser() user: CurrentUserPayload,
    @Param('siteId', new ParseUUIDPipe()) siteId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.removeFavoriteSiteUseCase.execute({
      userId: user.userId,
      siteId,
    });

    return ApiResponseUtil.success(
      { message: 'Removed from favorites' },
      'Removed from favorites',
    );
  }

  @Get('me/favorite-sites')
  @HttpCode(HttpStatus.OK)
  async listFavoriteSites(
    @CurrentUser() user: CurrentUserPayload,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ): Promise<ApiResponse<SiteResponse[]>> {
    const result = await this.listFavoriteSitesUseCase.execute({
      userId: user.userId,
      cursor,
      limit: limit ? Number(limit) : undefined,
    });

    const sites = result.data.map((item) => item.site);

    const mappedSites: SiteResponse[] = sites.map((site) => ({
      id: site.id,
      name: site.name,
      category: site.category
        ? {
            id: site.category.id,
            name: site.category.name,
          }
        : {
            id: '',
            name: '',
          },
      logoUrl: buildFullUrl(this.apiServiceUrl, site.logoUrl || null) || undefined,
      mainImageUrl:
        buildFullUrl(this.apiServiceUrl, site.mainImageUrl || null) || undefined,
      siteImageUrl:
        buildFullUrl(this.apiServiceUrl, site.siteImageUrl || null) || undefined,
      tier: site.tier
        ? {
            id: site.tier.id,
            name: site.tier.name,
            order: site.tier.order,
            color: site.tier.color || undefined,
          }
        : undefined,
      permanentUrl: site.permanentUrl || undefined,
      status: site.status,
      description: site.description || undefined,
      reviewCount: site.reviewCount,
      averageRating: Number(site.averageRating),
      badges: (site.siteBadges || [])
        .map((sb) => {
          // Filter out if badge is null or deleted
          if (!sb.badge || sb.badge.deletedAt) {
            return null;
          }
          return {
            id: sb.badge.id,
            name: sb.badge.name,
            iconUrl:
              buildFullUrl(this.apiServiceUrl, sb.badge.iconUrl || null) || undefined,
          };
        })
        .filter((badge): badge is NonNullable<typeof badge> => badge !== null),
      domains: (site.siteDomains || []).map((sd) => ({
        id: sd.id,
        domain: sd.domain,
        isActive: sd.isActive,
        isCurrent: sd.isCurrent,
      })),
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
      firstCharge: site.firstCharge ? Number(site.firstCharge) : undefined,
      recharge: site.recharge ? Number(site.recharge) : undefined,
      experience: site.experience,
      issueCount: site.issueCount || 0,
    }));

    return ApiResponseUtil.success(mappedSites);
  }

  @Put('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangePasswordDto,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.changePasswordUseCase.execute({
      userId: user.userId,
      tokenId: user.tokenId,
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
  @UseInterceptors(FileInterceptor('avatar'))
  async updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateProfileDto,
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
    @Req() req?: Request,
  ): Promise<ApiResponse<UserResponse>> {
    let avatarUrl: string | undefined;

    // Upload avatar if provided
    if (file) {
      const uploadResult = await this.uploadService.uploadAvatar(file, user.userId);
      // Save relative path to database, not full URL
      avatarUrl = uploadResult.relativePath;
    }

    // Check if phone is being changed
    const currentUser = await this.userRepository.findById(user.userId, ['userProfile']);
    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    const currentPhone = currentUser.userProfile?.phone || null;
    const newPhone = dto.phone || null;

    // Normalize phone numbers for comparison
    const normalizedCurrentPhone = normalizePhone(currentPhone);
    const normalizedNewPhone = normalizePhone(newPhone);
    const phoneChanged =
      normalizedNewPhone !== null && normalizedNewPhone !== normalizedCurrentPhone;

    // If phone is being changed, require token
    if (phoneChanged && !dto.token) {
      throw new BadRequestException('Token is required when updating phone number');
    }

    // Determine client IP (for auditing)
    const ipAddress = req ? getClientIp(req) : undefined;

    // Update profile with displayName, avatarUrl and audit IP
    await this.updateProfileUseCase.execute({
      userId: user.userId,
      displayName: dto.displayName,
      avatarUrl,
      bio: dto.bio,
      phone: dto.phone,
      token: dto.token,
      birthDate: dto.birthDate,
      gender: dto.gender,
      activeBadge: dto.activeBadge,
      ipAddress,
    });

    // Reload user with relations for response
    const dbUser = await this.userRepository.findById(user.userId, [
      'userRoles',
      'userRoles.role',
      'userBadges',
      'userBadges.badge',
      'userProfile',
    ]);

    if (!dbUser) {
      throw new NotFoundException('User not found');
    }

    // Map single active badge (filter out soft-deleted badges)
    let badgeSummary: { name: string; iconUrl?: string; earnedAt?: Date } | null = null;
    if (dbUser.userBadges) {
      for (const userBadge of dbUser.userBadges) {
        if (userBadge?.badge && !userBadge.badge.deletedAt && userBadge.active) {
          const badge = userBadge.badge;
          badgeSummary = {
            name: badge.name,
            iconUrl: buildFullUrl(this.apiServiceUrl, badge.iconUrl || null) || undefined,
            earnedAt: userBadge.earnedAt,
          };
          break;
        }
      }
    }

    const userResponse: UserResponse = {
      email: dbUser.email,
      displayName: dbUser.displayName || undefined,
      avatarUrl: buildFullUrl(this.apiServiceUrl, dbUser.avatarUrl),
      lastLoginAt: dbUser.lastLoginAt || undefined,
      roles: this.mapUserRoles(dbUser),
      badge: badgeSummary,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
      bio: dbUser.userProfile?.bio || undefined,
      phone: dbUser.userProfile?.phone || undefined,
      birthDate: dbUser.userProfile?.birthDate || undefined,
      gender: dbUser.userProfile?.gender || undefined,
      points: dbUser.userProfile?.points ?? 0,
    };

    return ApiResponseUtil.success(userResponse, 'Profile updated successfully');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getMe(
    @CurrentUser() user: CurrentUserPayload,
    @Req() req?: Request,
  ): Promise<ApiResponse<UserResponse>> {
    const dbUser = await this.userRepository.findById(user.userId, [
      'userRoles',
      'userRoles.role',
      'userBadges',
      'userBadges.badge',
      'userProfile',
    ]);
    if (!dbUser) {
      throw new NotFoundException('User not found');
    }

    // Update last request IP for auditing
    if (req && dbUser.userProfile) {
      const ipAddress = getClientIp(req);
      dbUser.userProfile.lastRequestIp = ipAddress;
      await this.userRepository.save(dbUser);
    }

    // Map single active badge (filter out soft-deleted badges)
    let badgeSummary: { name: string; iconUrl?: string; earnedAt?: Date } | null = null;
    if (dbUser.userBadges) {
      for (const userBadge of dbUser.userBadges) {
        if (userBadge?.badge && !userBadge.badge.deletedAt && userBadge.active) {
          const badge = userBadge.badge;
          badgeSummary = {
            name: badge.name,
            iconUrl: buildFullUrl(this.apiServiceUrl, badge.iconUrl || null) || null,
            earnedAt: userBadge.earnedAt,
          };
          break;
        }
      }
    }

    const userResponse: UserResponse = {
      email: dbUser.email,
      displayName: dbUser.displayName || undefined,
      avatarUrl: buildFullUrl(this.apiServiceUrl, dbUser.avatarUrl),
      bio: dbUser.userProfile?.bio || undefined,
      phone: dbUser.userProfile?.phone || undefined,
      birthDate: dbUser.userProfile?.birthDate || undefined,
      gender: dbUser.userProfile?.gender || undefined,
      points: dbUser.userProfile?.points ?? 0,
      lastLoginAt: dbUser.lastLoginAt || undefined,
      roles: this.mapUserRoles(dbUser),
      badge: badgeSummary,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    };

    return ApiResponseUtil.success(userResponse);
  }

  @Get('/me/badges')
  @HttpCode(HttpStatus.OK)
  async getMyBadges(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ApiResponse<BadgeResponse[]>> {
    // Query all active user badges (not deleted, isActive = true, badgeType = 'user')
    const allUserBadges = await this.badgeRepository.findAll(1, BadgeType.USER);

    // Query user's earned badges
    const dbUser = await this.userRepository.findByIdWithBadges(user.userId);
    if (!dbUser) {
      throw new NotFoundException('User not found');
    }

    // Create a map of user's earned badges by badgeId
    const earnedBadgesMap = new Map<string, { earnedAt: Date; active: boolean }>();
    const userBadges = dbUser.userBadges || [];
    for (const userBadge of userBadges) {
      if (userBadge?.badge && !userBadge.badge.deletedAt) {
        earnedBadgesMap.set(userBadge.badgeId, {
          earnedAt: userBadge.earnedAt,
          active: userBadge.active,
        });
      }
    }

    // Map all badges and mark which ones user has earned
    const badges: BadgeResponse[] = allUserBadges.map((badge) => {
      return {
        name: badge.name,
        iconUrl: buildFullUrl(this.apiServiceUrl, badge.iconUrl || null) || undefined,
        active: earnedBadgesMap.has(badge.id) || false,
        obtain: badge.obtain || null,
        description: badge.description || null,
        id: badge.id,
      };
    });

    return ApiResponseUtil.success(badges);
  }

  @Get('activity')
  @HttpCode(HttpStatus.OK)
  async getActivity(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ApiResponse<{ favorite: SiteResponse[]; recent: SiteResponse[] }>> {
    const result = await this.getActivityUseCase.execute({
      userId: user.userId,
    });

    const mapSiteToResponse = (site: Site): SiteResponse => ({
      id: site.id,
      name: site.name,
      category: site.category
        ? {
            id: site.category.id,
            name: site.category.name,
          }
        : {
            id: '',
            name: '',
          },
      logoUrl: buildFullUrl(this.apiServiceUrl, site.logoUrl || null) || undefined,
      mainImageUrl:
        buildFullUrl(this.apiServiceUrl, site.mainImageUrl || null) || undefined,
      siteImageUrl:
        buildFullUrl(this.apiServiceUrl, site.siteImageUrl || null) || undefined,
      tier: site.tier
        ? {
            id: site.tier.id,
            name: site.tier.name,
            order: site.tier.order,
            color: site.tier.color || undefined,
          }
        : undefined,
      permanentUrl: site.permanentUrl || undefined,
      status: site.status,
      description: site.description || undefined,
      reviewCount: site.reviewCount,
      averageRating: Number(site.averageRating),
      badges: (site.siteBadges || [])
        .map((sb) => {
          // Filter out if badge is null or deleted
          if (!sb.badge || sb.badge.deletedAt) {
            return null;
          }
          return {
            id: sb.badge.id,
            name: sb.badge.name,
            iconUrl:
              buildFullUrl(this.apiServiceUrl, sb.badge.iconUrl || null) || undefined,
          };
        })
        .filter((badge): badge is NonNullable<typeof badge> => badge !== null),
      domains: (site.siteDomains || []).map((sd) => ({
        id: sd.id,
        domain: sd.domain,
        isActive: sd.isActive,
        isCurrent: sd.isCurrent,
      })),
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
      firstCharge: site.firstCharge ? Number(site.firstCharge) : undefined,
      recharge: site.recharge ? Number(site.recharge) : undefined,
      experience: site.experience,
      issueCount: site.issueCount || 0,
    });

    const favoriteSites = result.favorite.map(mapSiteToResponse);
    const recentSites = result.recent.map(mapSiteToResponse);

    return ApiResponseUtil.success({
      favorite: favoriteSites,
      recent: recentSites,
    });
  }
}
