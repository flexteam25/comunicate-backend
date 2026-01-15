import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import {
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../../../shared/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../../shared/decorators/current-user.decorator';
import { UploadService, MulterFile } from '../../../../../shared/services/upload';
import { CreateSiteReviewUseCase } from '../../../application/handlers/create-site-review.use-case';
import { UpdateSiteReviewUseCase } from '../../../application/handlers/update-site-review.use-case';
import { DeleteSiteReviewUseCase } from '../../../application/handlers/delete-site-review.use-case';
import { ListSiteReviewsUseCase } from '../../../application/handlers/list-site-reviews.use-case';
import { GetSiteReviewUseCase } from '../../../application/handlers/get-site-review.use-case';
import { GetSiteReviewStatisticsUseCase } from '../../../application/handlers/get-site-review-statistics.use-case';
import { ListMySiteReviewsUseCase } from '../../../application/handlers/list-my-site-reviews.use-case';
import { ReactToSiteReviewUseCase } from '../../../application/handlers/react-to-site-review.use-case';
import { AddCommentUseCase } from '../../../application/handlers/add-comment.use-case';
import { UpdateCommentUseCase } from '../../../application/handlers/update-comment.use-case';
import { DeleteCommentUseCase } from '../../../application/handlers/delete-comment.use-case';
import { ListCommentsUseCase } from '../../../application/handlers/list-comments.use-case';
import { CreateSiteReviewDto } from '../dto/create-site-review.dto';
import { UpdateSiteReviewDto } from '../dto/update-site-review.dto';
import { ReactToSiteReviewDto } from '../dto/react-to-site-review.dto';
import { AddCommentDto } from '../dto/add-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import {
  SiteReviewResponseDto,
  SiteReviewCommentResponseDto,
} from '../dto/site-review-response.dto';
import { SiteReviewStatisticsResponseDto } from '../dto/site-review-statistics-response.dto';
import { ListSiteReviewsQueryDto } from '../dto/list-site-reviews-query.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';

@Controller('api/site-reviews')
export class SiteReviewController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly createSiteReviewUseCase: CreateSiteReviewUseCase,
    private readonly updateSiteReviewUseCase: UpdateSiteReviewUseCase,
    private readonly deleteSiteReviewUseCase: DeleteSiteReviewUseCase,
    private readonly listSiteReviewsUseCase: ListSiteReviewsUseCase,
    private readonly getSiteReviewUseCase: GetSiteReviewUseCase,
    private readonly getSiteReviewStatisticsUseCase: GetSiteReviewStatisticsUseCase,
    private readonly listMySiteReviewsUseCase: ListMySiteReviewsUseCase,
    private readonly reactToSiteReviewUseCase: ReactToSiteReviewUseCase,
    private readonly addCommentUseCase: AddCommentUseCase,
    private readonly updateCommentUseCase: UpdateCommentUseCase,
    private readonly deleteCommentUseCase: DeleteCommentUseCase,
    private readonly listCommentsUseCase: ListCommentsUseCase,
    private readonly configService: ConfigService,
    private readonly uploadService: UploadService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  private mapSiteReviewToResponse(review: any): SiteReviewResponseDto {
    return {
      id: review.id,
      siteId: review.siteId,
      siteSlug: review.site?.slug || null,
      siteName: review.site?.name || null,
      userId: review.userId,
      userName: review.user?.displayName || null,
      userAvatarUrl:
        buildFullUrl(this.apiServiceUrl, review.user?.avatarUrl || null) || null,
      userBadge: (() => {
        const activeBadge = review.user?.userBadges?.find(
          (ub: any) => ub?.badge && ub.badge.isActive && !ub.badge.deletedAt && ub.active,
        );
        if (!activeBadge) return null;
        return {
          name: activeBadge.badge.name,
          iconUrl: buildFullUrl(this.apiServiceUrl, activeBadge.badge.iconUrl || null),
          iconName: activeBadge.badge.iconName || null,
          color: activeBadge.badge.color || null,
          earnedAt: activeBadge.earnedAt,
          description: activeBadge.badge.description || null,
          obtain: activeBadge.badge.obtain || null,
        };
      })(),
      rating: review.rating ?? 0,
      odds: review.odds ?? 0,
      limit: review.limit ?? 0,
      event: review.event ?? 0,
      speed: review.speed ?? 0,
      content: review.content,
      images: (review.images || []).map((img: any) => ({
        id: img.id,
        imageUrl: buildFullUrl(this.apiServiceUrl, img.imageUrl) || img.imageUrl,
        order: img.order,
        createdAt: img.createdAt,
      })),
      isPublished: review.isPublished,
      reactions: {
        like: review.likeCount || 0,
        dislike: review.dislikeCount || 0,
      },
      commentCount: review.commentCount || 0,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  private mapCommentToResponse(comment: any): SiteReviewCommentResponseDto {
    return {
      id: comment.id,
      content: comment.content,
      userId: comment.userId,
      userName: comment.user?.displayName || null,
      userAvatarUrl:
        buildFullUrl(this.apiServiceUrl, comment.user?.avatarUrl || null) || null,
      userBadge: (() => {
        const activeBadge = comment.user?.userBadges?.find(
          (ub: any) => ub?.badge && ub.badge.isActive && !ub.badge.deletedAt && ub.active,
        );
        if (!activeBadge) return null;
        return {
          name: activeBadge.badge.name,
          iconUrl: buildFullUrl(this.apiServiceUrl, activeBadge.badge.iconUrl || null),
          iconName: activeBadge.badge.iconName || null,
          color: activeBadge.badge.color || null,
          earnedAt: activeBadge.earnedAt,
          description: activeBadge.badge.description || null,
          obtain: activeBadge.badge.obtain || null,
        };
      })(),
      parentCommentId: comment.parentCommentId || null,
      hasChild: comment.hasChild || false,
      images: (comment.images || []).map((img: any) => ({
        id: img.id,
        imageUrl: buildFullUrl(this.apiServiceUrl, img.imageUrl),
        order: img.order,
        createdAt: img.createdAt,
      })),
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  @HttpCode(HttpStatus.CREATED)
  async createSiteReview(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateSiteReviewDto,
    @UploadedFile() file?: MulterFile,
  ): Promise<ApiResponse<SiteReviewResponseDto>> {
    let imageUrl: string | undefined;

    // Upload image if provided
    if (file) {
      // Validate file
      if (file.size > 20 * 1024 * 1024) {
        throw badRequest(MessageKeys.IMAGE_FILE_SIZE_EXCEEDS_LIMIT, {
          maxSize: '20MB',
        });
      }
      if (!/(jpg|jpeg|png|webp)$/i.test(file.mimetype)) {
        throw badRequest(MessageKeys.INVALID_IMAGE_FILE_TYPE, {
          allowedTypes: 'jpg, jpeg, png, webp',
        });
      }
      const uploadResult = await this.uploadService.uploadImage(file, {
        folder: 'site-reviews',
      });
      imageUrl = uploadResult.relativePath;
    }

    const review = await this.createSiteReviewUseCase.execute({
      userId: user.userId,
      siteId: dto.siteId,
      rating: dto.rating,
      odds: dto.odds,
      limit: dto.limit,
      event: dto.event,
      speed: dto.speed,
      content: dto.content,
      imageUrl,
    });

    return ApiResponseUtil.success(
      this.mapSiteReviewToResponse(review),
      MessageKeys.SITE_REVIEW_CREATED_SUCCESS,
    );
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async listSiteReviews(
    @Query() query: ListSiteReviewsQueryDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.listSiteReviewsUseCase.execute({
      siteId: query.siteId,
      isPublished: true, // Only published reviews for public API
      rating: query.rating,
      search: query.search,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'DESC',
      cursor: query.cursor,
      limit: query.limit,
    });

    return ApiResponseUtil.success({
      data: result.data.map((review) => this.mapSiteReviewToResponse(review)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Get('my-site-reviews')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async listMySiteReviews(
    @CurrentUser() user: CurrentUserPayload,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse<any>> {
    const result = await this.listMySiteReviewsUseCase.execute({
      userId: user.userId,
      cursor,
      limit: limit ? parseInt(limit, 10) : 20,
    });

    return ApiResponseUtil.success({
      data: result.data.map((review) => this.mapSiteReviewToResponse(review)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Get('statistics/:siteId')
  @HttpCode(HttpStatus.OK)
  async getSiteReviewStatistics(
    @Param('siteId') siteId: string,
  ): Promise<ApiResponse<SiteReviewStatisticsResponseDto>> {
    const statistics = await this.getSiteReviewStatisticsUseCase.execute({
      siteId,
    });

    return ApiResponseUtil.success(
      {
        siteId: statistics.siteId,
        averageRating: statistics.averageRating,
        averageOdds: statistics.averageOdds,
        averageLimit: statistics.averageLimit,
        averageEvent: statistics.averageEvent,
        averageSpeed: statistics.averageSpeed,
        reviewCount: statistics.reviewCount,
        topReviews: statistics.topReviews,
        highlights: statistics.highlights,
        enHighlights: statistics.enHighlights,
      },
      MessageKeys.SITE_REVIEW_STATISTICS_RETRIEVED_SUCCESS,
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getSiteReview(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<SiteReviewResponseDto>> {
    const review = await this.getSiteReviewUseCase.execute({ reviewId: id });
    return ApiResponseUtil.success(this.mapSiteReviewToResponse(review));
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  @HttpCode(HttpStatus.OK)
  async updateSiteReview(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateSiteReviewDto,
    @UploadedFile() file?: MulterFile,
  ): Promise<ApiResponse<SiteReviewResponseDto>> {
    let imageUrl: string | undefined;

    // Upload image if provided
    if (file) {
      // Validate file
      if (file.size > 20 * 1024 * 1024) {
        throw badRequest(MessageKeys.IMAGE_FILE_SIZE_EXCEEDS_LIMIT, {
          maxSize: '20MB',
        });
      }
      if (!/(jpg|jpeg|png|webp)$/i.test(file.mimetype)) {
        throw badRequest(MessageKeys.INVALID_IMAGE_FILE_TYPE, {
          allowedTypes: 'jpg, jpeg, png, webp',
        });
      }
      const uploadResult = await this.uploadService.uploadImage(file, {
        folder: 'site-reviews',
      });
      imageUrl = uploadResult.relativePath;
    }

    const review = await this.updateSiteReviewUseCase.execute({
      reviewId: id,
      userId: user.userId,
      rating: dto.rating,
      odds: dto.odds,
      limit: dto.limit,
      event: dto.event,
      speed: dto.speed,
      content: dto.content,
      imageUrl,
    });

    return ApiResponseUtil.success(
      this.mapSiteReviewToResponse(review),
      MessageKeys.SITE_REVIEW_UPDATED_SUCCESS,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteSiteReview(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.deleteSiteReviewUseCase.execute({
      reviewId: id,
      userId: user.userId,
    });

    return ApiResponseUtil.success(null, MessageKeys.SITE_REVIEW_DELETED_SUCCESS);
  }

  @Post(':id/react')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async reactToSiteReview(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ReactToSiteReviewDto,
  ): Promise<ApiResponse<any>> {
    const reaction = await this.reactToSiteReviewUseCase.execute({
      reviewId: id,
      userId: user.userId,
      reactionType: dto.reactionType,
    });

    return ApiResponseUtil.success(reaction, MessageKeys.REACTION_UPDATED_SUCCESS);
  }

  @Get(':id/comments')
  @HttpCode(HttpStatus.OK)
  async listComments(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('parentCommentId') parentCommentId?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ): Promise<ApiResponse<any>> {
    // Convert empty string to undefined, but keep null as null
    const normalizedParentCommentId =
      parentCommentId === '' || parentCommentId === undefined
        ? undefined
        : parentCommentId === 'null'
          ? null
          : parentCommentId;

    const result = await this.listCommentsUseCase.execute({
      reviewId: id,
      parentCommentId: normalizedParentCommentId,
      cursor,
      limit: limit ? parseInt(limit, 10) : 20,
      userId: user?.userId,
    });

    return ApiResponseUtil.success({
      data: result.data.map((comment) => this.mapCommentToResponse(comment)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 5 }]))
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: AddCommentDto,
    @UploadedFiles()
    files?: {
      images?: MulterFile[];
    },
  ): Promise<ApiResponse<SiteReviewCommentResponseDto>> {
    const comment = await this.addCommentUseCase.execute({
      reviewId: id,
      userId: user.userId,
      content: dto.content,
      parentCommentId: dto.parentCommentId,
      images: files?.images,
    });

    return ApiResponseUtil.success(
      this.mapCommentToResponse(comment),
      MessageKeys.COMMENT_ADDED_SUCCESS,
    );
  }

  @Put(':id/comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 5 }]))
  @HttpCode(HttpStatus.OK)
  async updateComment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateCommentDto,
    @UploadedFiles()
    files?: {
      images?: MulterFile[];
    },
  ): Promise<ApiResponse<SiteReviewCommentResponseDto>> {
    const comment = await this.updateCommentUseCase.execute({
      commentId,
      userId: user.userId,
      content: dto.content,
      deleteImageIds: dto.deleteImageIds,
      images: files?.images,
    });

    return ApiResponseUtil.success(
      this.mapCommentToResponse(comment),
      MessageKeys.COMMENT_UPDATED_SUCCESS,
    );
  }

  @Delete('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteComment(
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.deleteCommentUseCase.execute({
      commentId,
      userId: user.userId,
    });

    return ApiResponseUtil.success(null, MessageKeys.COMMENT_DELETED_SUCCESS);
  }
}
