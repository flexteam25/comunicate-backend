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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../../shared/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../../shared/decorators/current-user.decorator';
import { CreateSiteReviewUseCase } from '../../../application/handlers/create-site-review.use-case';
import { UpdateSiteReviewUseCase } from '../../../application/handlers/update-site-review.use-case';
import { DeleteSiteReviewUseCase } from '../../../application/handlers/delete-site-review.use-case';
import { ListSiteReviewsUseCase } from '../../../application/handlers/list-site-reviews.use-case';
import { GetSiteReviewUseCase } from '../../../application/handlers/get-site-review.use-case';
import { ListMySiteReviewsUseCase } from '../../../application/handlers/list-my-site-reviews.use-case';
import { ReactToSiteReviewUseCase } from '../../../application/handlers/react-to-site-review.use-case';
import { AddCommentUseCase } from '../../../application/handlers/add-comment.use-case';
import { DeleteCommentUseCase } from '../../../application/handlers/delete-comment.use-case';
import { ListCommentsUseCase } from '../../../application/handlers/list-comments.use-case';
import { CreateSiteReviewDto } from '../dto/create-site-review.dto';
import { UpdateSiteReviewDto } from '../dto/update-site-review.dto';
import { ReactToSiteReviewDto } from '../dto/react-to-site-review.dto';
import { AddCommentDto } from '../dto/add-comment.dto';
import {
  SiteReviewResponseDto,
  SiteReviewCommentResponseDto,
} from '../dto/site-review-response.dto';
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
    private readonly listMySiteReviewsUseCase: ListMySiteReviewsUseCase,
    private readonly reactToSiteReviewUseCase: ReactToSiteReviewUseCase,
    private readonly addCommentUseCase: AddCommentUseCase,
    private readonly deleteCommentUseCase: DeleteCommentUseCase,
    private readonly listCommentsUseCase: ListCommentsUseCase,
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
      userAvatarUrl:
        buildFullUrl(this.apiServiceUrl, review.user?.avatarUrl || null) || null,
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

  private mapCommentToResponse(comment: any): SiteReviewCommentResponseDto {
    return {
      id: comment.id,
      content: comment.content,
      userId: comment.userId,
      userName: comment.user?.displayName || null,
      userAvatarUrl:
        buildFullUrl(this.apiServiceUrl, comment.user?.avatarUrl || null) || null,
      parentCommentId: comment.parentCommentId || null,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createSiteReview(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateSiteReviewDto,
  ): Promise<ApiResponse<SiteReviewResponseDto>> {
    const review = await this.createSiteReviewUseCase.execute({
      userId: user.userId,
      siteId: dto.siteId,
      rating: dto.rating,
      title: dto.title,
      content: dto.content,
    });

    return ApiResponseUtil.success(
      this.mapSiteReviewToResponse(review),
      'Site review created successfully',
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
  @HttpCode(HttpStatus.OK)
  async updateSiteReview(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateSiteReviewDto,
  ): Promise<ApiResponse<SiteReviewResponseDto>> {
    const review = await this.updateSiteReviewUseCase.execute({
      reviewId: id,
      userId: user.userId,
      rating: dto.rating,
      title: dto.title,
      content: dto.content,
    });

    return ApiResponseUtil.success(
      this.mapSiteReviewToResponse(review),
      'Site review updated successfully',
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

    return ApiResponseUtil.success(null, 'Site review deleted successfully');
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

    return ApiResponseUtil.success(reaction, 'Reaction updated successfully');
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
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: AddCommentDto,
  ): Promise<ApiResponse<SiteReviewCommentResponseDto>> {
    const comment = await this.addCommentUseCase.execute({
      reviewId: id,
      userId: user.userId,
      content: dto.content,
      parentCommentId: dto.parentCommentId,
    });

    return ApiResponseUtil.success(
      this.mapCommentToResponse(comment),
      'Comment added successfully',
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

    return ApiResponseUtil.success(null, 'Comment deleted successfully');
  }
}
