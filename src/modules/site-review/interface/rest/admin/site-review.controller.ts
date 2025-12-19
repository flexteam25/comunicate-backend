import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AdminJwtAuthGuard } from '../../../../admin/infrastructure/guards/admin-jwt-auth.guard';
import { AdminPermissionGuard } from '../../../../admin/infrastructure/guards/admin-permission.guard';
import { RequirePermission } from '../../../../admin/infrastructure/decorators/require-permission.decorator';
import { ListAllSiteReviewsUseCase } from '../../../application/handlers/admin/list-all-site-reviews.use-case';
import { GetSiteReviewUseCase } from '../../../application/handlers/get-site-review.use-case';
import { ApproveSiteReviewUseCase } from '../../../application/handlers/admin/approve-site-review.use-case';
import { RejectSiteReviewUseCase } from '../../../application/handlers/admin/reject-site-review.use-case';
import { SiteReviewResponseDto } from '../dto/site-review-response.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';

@Controller('admin/site-reviews')
@UseGuards(AdminJwtAuthGuard, AdminPermissionGuard)
export class AdminSiteReviewController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly listAllSiteReviewsUseCase: ListAllSiteReviewsUseCase,
    private readonly getSiteReviewUseCase: GetSiteReviewUseCase,
    private readonly approveSiteReviewUseCase: ApproveSiteReviewUseCase,
    private readonly rejectSiteReviewUseCase: RejectSiteReviewUseCase,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  private mapSiteReviewToResponse(review: any): SiteReviewResponseDto {
    return {
      id: review.id,
      siteId: review.siteId,
      siteName: review.site?.name || null,
      userId: review.userId,
      userName: review.user?.displayName || null,
      userAvatarUrl: buildFullUrl(this.apiServiceUrl, review.user?.avatarUrl || null) || null,
      rating: review.rating,
      title: review.title,
      content: review.content,
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

  @Get()
  @RequirePermission('site-reviews.moderate')
  @HttpCode(HttpStatus.OK)
  async listAllSiteReviews(
    @Query('siteId') siteId?: string,
    @Query('userId') userId?: string,
    @Query('isPublished') isPublished?: string,
    @Query('rating') rating?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse<any>> {
    const result = await this.listAllSiteReviewsUseCase.execute({
      siteId,
      userId,
      isPublished: isPublished ? isPublished === 'true' : undefined,
      rating: rating ? parseInt(rating, 10) : undefined,
      search,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'DESC',
      cursor,
      limit: limit ? parseInt(limit, 10) : 20,
    });

    return ApiResponseUtil.success({
      data: result.data.map((review) => this.mapSiteReviewToResponse(review)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Get(':id')
  @RequirePermission('site-reviews.moderate')
  @HttpCode(HttpStatus.OK)
  async getSiteReview(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<SiteReviewResponseDto>> {
    const review = await this.getSiteReviewUseCase.execute({ reviewId: id });
    return ApiResponseUtil.success(this.mapSiteReviewToResponse(review));
  }

  @Post(':id/approve')
  @RequirePermission('site-reviews.moderate')
  @HttpCode(HttpStatus.OK)
  async approveSiteReview(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<SiteReviewResponseDto>> {
    const review = await this.approveSiteReviewUseCase.execute({ reviewId: id });
    return ApiResponseUtil.success(
      this.mapSiteReviewToResponse(review),
      'Site review approved successfully',
    );
  }

  @Post(':id/reject')
  @RequirePermission('site-reviews.moderate')
  @HttpCode(HttpStatus.OK)
  async rejectSiteReview(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<SiteReviewResponseDto>> {
    const review = await this.rejectSiteReviewUseCase.execute({ reviewId: id });
    return ApiResponseUtil.success(
      this.mapSiteReviewToResponse(review),
      'Site review rejected successfully',
    );
  }
}
