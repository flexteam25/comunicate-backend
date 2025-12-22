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
  Get,
  Inject,
  Post,
  Delete,
  Param,
  Query,
  ParseUUIDPipe,
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
import { IUserRepository } from '../../infrastructure/persistence/repositories/user.repository';
import { BadgeResponse } from '../../../../shared/dto/badge-response.dto';
import { RoleResponse } from '../../../../shared/dto/role-response.dto';
import { AddFavoriteSiteUseCase } from '../../application/handlers/add-favorite-site.use-case';
import { RemoveFavoriteSiteUseCase } from '../../application/handlers/remove-favorite-site.use-case';
import { ListFavoriteSitesUseCase } from '../../application/handlers/list-favorite-sites.use-case';
import { GetActivityUseCase } from '../../application/handlers/get-activity.use-case';
import { SiteResponse } from '../../../site/interface/rest/dto/site-response.dto';
import { Site } from '../../../site/domain/entities/site.entity';

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
    private readonly addFavoriteSiteUseCase: AddFavoriteSiteUseCase,
    private readonly removeFavoriteSiteUseCase: RemoveFavoriteSiteUseCase,
    private readonly listFavoriteSitesUseCase: ListFavoriteSitesUseCase,
    private readonly getActivityUseCase: GetActivityUseCase,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
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
            description: site.category.description || undefined,
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
            description: site.tier.description || undefined,
            order: site.tier.order,
            color: site.tier.color || undefined,
          }
        : undefined,
      permanentUrl: site.permanentUrl || undefined,
      status: site.status,
      description: site.description || undefined,
      reviewCount: site.reviewCount,
      averageRating: Number(site.averageRating),
      badges: (site.siteBadges || []).map((sb) => ({
        id: sb.badge.id,
        name: sb.badge.name,
        description: sb.badge.description || undefined,
        iconUrl: buildFullUrl(this.apiServiceUrl, sb.badge.iconUrl || null) || undefined,
      })),
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
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/i }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: MulterFile,
  ): Promise<ApiResponse<UserResponse>> {
    let avatarUrl: string | undefined;

    // Upload avatar if provided
    if (file) {
      const uploadResult = await this.uploadService.uploadAvatar(file, user.userId);
      // Save relative path to database, not full URL
      avatarUrl = uploadResult.relativePath;
    }

    // Update profile with displayName and/or avatarUrl
    const updatedUser = await this.updateProfileUseCase.execute({
      userId: user.userId,
      displayName: dto.displayName,
      avatarUrl,
      bio: dto.bio,
      phone: dto.phone,
      birthDate: dto.birthDate,
      gender: dto.gender,
    });

    const userResponse: UserResponse = {
      email: updatedUser.email,
      displayName: updatedUser.displayName || undefined,
      avatarUrl: buildFullUrl(this.apiServiceUrl, updatedUser.avatarUrl),
      isActive: updatedUser.isActive,
      lastLoginAt: updatedUser.lastLoginAt || undefined,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      bio: updatedUser.userProfile?.bio || undefined,
      phone: updatedUser.userProfile?.phone || undefined,
      birthDate: updatedUser.userProfile?.birthDate || undefined,
      gender: updatedUser.userProfile?.gender || undefined,
    };

    return ApiResponseUtil.success(userResponse, 'Profile updated successfully');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getMe(
    @CurrentUser() user: CurrentUserPayload,
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

    // Map roles
    const roles: RoleResponse[] = [];
    if (dbUser.userRoles) {
      for (const userRole of dbUser.userRoles) {
        if (userRole?.role) {
          roles.push({
            id: userRole.role.id,
            name: userRole.role.name,
          });
        }
      }
    }

    // Map badges
    const badges: BadgeResponse[] = [];
    if (dbUser.userBadges) {
      for (const userBadge of dbUser.userBadges) {
        if (userBadge?.badge) {
          const badge = userBadge.badge;
          badges.push({
            id: badge.id,
            name: badge.name,
            description: badge.description || undefined,
            iconUrl: buildFullUrl(this.apiServiceUrl, badge.iconUrl || null) || undefined,
            earnedAt: userBadge.earnedAt,
          });
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
      isActive: dbUser.isActive,
      lastLoginAt: dbUser.lastLoginAt || undefined,
      roles: roles.length > 0 ? roles : [],
      badges: badges.length > 0 ? badges : [],
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
    const dbUser = await this.userRepository.findByIdWithBadges(user.userId);
    if (!dbUser) {
      throw new NotFoundException('User not found');
    }

    const userBadges = dbUser.userBadges || [];
    const badges: BadgeResponse[] = [];

    for (const userBadge of userBadges) {
      if (userBadge?.badge) {
        const badge = userBadge.badge;
        badges.push({
          id: badge.id,
          name: badge.name,
          description: badge.description || undefined,
          iconUrl: buildFullUrl(this.apiServiceUrl, badge.iconUrl || null) || undefined,
          earnedAt: userBadge.earnedAt,
        });
      }
    }

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
            description: site.category.description || undefined,
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
            description: site.tier.description || undefined,
            order: site.tier.order,
            color: site.tier.color || undefined,
          }
        : undefined,
      permanentUrl: site.permanentUrl || undefined,
      status: site.status,
      description: site.description || undefined,
      reviewCount: site.reviewCount,
      averageRating: Number(site.averageRating),
      badges: (site.siteBadges || []).map((sb) => ({
        id: sb.badge?.id || '',
        name: sb.badge?.name || '',
        description: sb.badge?.description || undefined,
        iconUrl: buildFullUrl(this.apiServiceUrl, sb.badge?.iconUrl || null) || undefined,
      })),
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
