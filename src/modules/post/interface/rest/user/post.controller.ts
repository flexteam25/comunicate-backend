import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFiles,
  Req,
  Delete,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../../../shared/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../../../../shared/guards/optional-jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../../shared/decorators/current-user.decorator';
import { ListPublicPostsUseCase } from '../../../application/handlers/user/list-posts.use-case';
import { GetPostUseCase as GetPublicPostUseCase } from '../../../application/handlers/user/get-post.use-case';
import { ListCategoriesUseCase } from '../../../application/handlers/user/list-categories.use-case';
import { ReactToPostUseCase } from '../../../application/handlers/user/react-to-post.use-case';
import { AddCommentUseCase } from '../../../application/handlers/user/add-comment.use-case';
import { UpdateCommentUseCase } from '../../../application/handlers/user/update-comment.use-case';
import { ListCommentsUseCase } from '../../../application/handlers/user/list-comments.use-case';
import { DeleteReactionUseCase } from '../../../application/handlers/user/delete-reaction.use-case';
import { DeleteCommentUseCase } from '../../../application/handlers/user/delete-comment.use-case';
import { ReactToCommentUseCase } from '../../../application/handlers/user/react-to-comment.use-case';
import { DeleteCommentReactionUseCase } from '../../../application/handlers/user/delete-comment-reaction.use-case';
import { ListPostsQueryDto } from '../dto/list-posts-query.dto';
import { ListCommentsQueryDto } from '../dto/list-comments-query.dto';
import { ReactToPostDto } from '../dto/react-to-post.dto';
import { ReactToCommentDto } from '../dto/react-to-comment.dto';
import { AddCommentDto } from '../dto/add-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { MessageKeys } from '../../../../../shared/exceptions/exception-helpers';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';
import { getClientIp } from '../../../../../shared/utils/request.util';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { MulterFile } from '../../../../../shared/services/upload';
import { CreatePostUseCase } from '../../../application/handlers/user/create-post.use-case';
import { UpdatePostUseCase } from '../../../application/handlers/user/update-post.use-case';
import { DeletePostUseCase } from '../../../application/handlers/user/delete-post.use-case';
import { CreatePostDto } from '../dto/create-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { UploadedFile } from '@nestjs/common';

@Controller('api/posts')
@UseGuards(OptionalJwtAuthGuard)
export class PostController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly listPublicPostsUseCase: ListPublicPostsUseCase,
    private readonly getPostUseCase: GetPublicPostUseCase,
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly createPostUseCase: CreatePostUseCase,
    private readonly updatePostUseCase: UpdatePostUseCase,
    private readonly deletePostUseCase: DeletePostUseCase,
    private readonly reactToPostUseCase: ReactToPostUseCase,
    private readonly addCommentUseCase: AddCommentUseCase,
    private readonly updateCommentUseCase: UpdateCommentUseCase,
    private readonly listCommentsUseCase: ListCommentsUseCase,
    private readonly deleteReactionUseCase: DeleteReactionUseCase,
    private readonly deleteCommentUseCase: DeleteCommentUseCase,
    private readonly reactToCommentUseCase: ReactToCommentUseCase,
    private readonly deleteCommentReactionUseCase: DeleteCommentReactionUseCase,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  private mapPostToResponse(post: any): any {
    return {
      id: post.id,
      userId: post.userId || null,
      userName: post.user?.displayName || null,
      userAvatarUrl:
        buildFullUrl(this.apiServiceUrl, post.user?.avatarUrl || null) || null,
      userBadge: (() => {
        const activeBadge = post.user?.userBadges?.find(
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
      adminId: post.adminId || null,
      adminName: post.admin?.displayName || null,
      adminAvatarUrl:
        buildFullUrl(this.apiServiceUrl, post.admin?.avatarUrl || null) || null,
      categoryId: post.categoryId,
      categoryName: post.category?.name || null,
      categoryNameKo: post.category?.nameKo || null,
      title: post.title,
      content: post.content,
      thumbnailUrl: post.thumbnailUrl
        ? buildFullUrl(this.apiServiceUrl, post.thumbnailUrl)
        : null,
      likeCount: post.likeCount || 0,
      dislikeCount: post.dislikeCount || 0,
      commentCount: post.commentCount || 0,
      viewCount: post.viewCount || 0,
      reacted: post.reacted || null, // 'like', 'dislike', or null
      isPinned: post.isPinned || false,
      publishedAt: post.publishedAt || null,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }

  private mapCommentToResponse(comment: any): any {
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
      likeCount: comment.likeCount || 0,
      dislikeCount: comment.dislikeCount || 0,
      reacted: comment.reacted || null, // 'like', 'dislike', or null
      images: (comment.images || []).map((img: any) => ({
        id: img.id,
        imageUrl: buildFullUrl(this.apiServiceUrl, img.imageUrl) || null,
        order: img.order,
      })),
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async listPosts(
    @Query() query: ListPostsQueryDto,
    @CurrentUser() user?: CurrentUserPayload,
  ): Promise<ApiResponse<any>> {
    const result = await this.listPublicPostsUseCase.execute({
      categoryId: query.categoryId,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      cursor: query.cursor,
      limit: query.limit,
      userId: user?.userId,
    });

    return ApiResponseUtil.success({
      data: result.data.map((post) => this.mapPostToResponse(post)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Get('categories')
  @HttpCode(HttpStatus.OK)
  async listCategories(): Promise<ApiResponse<any>> {
    const categories = await this.listCategoriesUseCase.execute();
    return ApiResponseUtil.success(
      categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        nameKo: cat.nameKo || null,
        description: cat.description || null,
        showMain: cat.showMain ?? false,
        isPointBanner: cat.isPointBanner ?? false,
        orderInMain: cat.orderInMain ?? null,
        specialKey: cat.specialKey || null,
        order: cat.order || null,
        adminCreateOnly: cat.adminCreateOnly ?? true,
      })),
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getPost(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
    @CurrentUser() user?: CurrentUserPayload,
  ): Promise<ApiResponse<any>> {
    const ipAddress = getClientIp(req);

    const post = await this.getPostUseCase.execute({
      postId: id,
      userId: user?.userId,
      ipAddress,
    });

    return ApiResponseUtil.success({
      ...this.mapPostToResponse(post),
      content: post.content, // Include full content in detail
    });
  }

  @Post(':id/reactions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async reactToPost(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReactToPostDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ApiResponse<any>> {
    const reaction = await this.reactToPostUseCase.execute({
      postId: id,
      userId: user.userId,
      reactionType: dto.reactionType,
    });

    return ApiResponseUtil.success(
      {
        id: reaction.id,
        reactionType: reaction.reactionType,
      },
      'Reaction added successfully',
    );
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 5 }]))
  async addComment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AddCommentDto,
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFiles()
    files?: {
      images?: MulterFile[];
    },
  ): Promise<ApiResponse<any>> {
    const comment = await this.addCommentUseCase.execute({
      postId: id,
      userId: user.userId,
      content: dto.content,
      parentCommentId: dto.parentCommentId,
      images: files?.images,
    });

    return ApiResponseUtil.success(
      this.mapCommentToResponse(comment),
      'Comment added successfully',
    );
  }

  @Put(':id/comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 5 }]))
  async updateComment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFiles()
    files?: {
      images?: MulterFile[];
    },
  ): Promise<ApiResponse<any>> {
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

  @Get(':id/comments')
  @HttpCode(HttpStatus.OK)
  async listComments(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: ListCommentsQueryDto,
    @CurrentUser() user?: CurrentUserPayload,
  ): Promise<ApiResponse<any>> {
    const result = await this.listCommentsUseCase.execute({
      postId: id,
      parentCommentId: query.parentCommentId,
      cursor: query.cursor,
      limit: query.limit,
      userId: user?.userId,
    });

    return ApiResponseUtil.success({
      data: result.data.map((comment) => this.mapCommentToResponse(comment)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Delete(':id/reactions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteReaction(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.deleteReactionUseCase.execute({
      postId: id,
      userId: user.userId,
    });
    return ApiResponseUtil.success(
      null,
      MessageKeys.REACTION_DELETED_SUCCESS,
    );
  }

  @Post(':postId/comments/:commentId/reactions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async reactToComment(
    @Param('postId', new ParseUUIDPipe()) postId: string,
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
    @Body() dto: ReactToCommentDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ApiResponse<any>> {
    const reaction = await this.reactToCommentUseCase.execute({
      commentId,
      userId: user.userId,
      reactionType: dto.reactionType,
    });

    return ApiResponseUtil.success(
      {
        id: reaction.id,
        reactionType: reaction.reactionType,
      },
      'Reaction added successfully',
    );
  }

  @Delete(':postId/comments/:commentId/reactions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteCommentReaction(
    @Param('postId', new ParseUUIDPipe()) postId: string,
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.deleteCommentReactionUseCase.execute({
      commentId,
      userId: user.userId,
    });
    return ApiResponseUtil.success(
      null,
      MessageKeys.REACTION_DELETED_SUCCESS,
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
    return ApiResponseUtil.success(
      null,
      MessageKeys.COMMENT_DELETED_SUCCESS,
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('thumbnail'))
  @HttpCode(HttpStatus.CREATED)
  async createPost(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreatePostDto,
    @UploadedFile() thumbnail?: MulterFile,
  ): Promise<ApiResponse<any>> {
    const post = await this.createPostUseCase.execute({
      userId: user.userId,
      categoryId: dto.categoryId,
      title: dto.title,
      content: dto.content,
      thumbnail,
      isPublished: dto.isPublished,
    });

    return ApiResponseUtil.success(
      this.mapPostToResponse(post),
      MessageKeys.POST_CREATED_SUCCESS,
    );
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('thumbnail'))
  @HttpCode(HttpStatus.OK)
  async updatePost(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePostDto,
    @UploadedFile() thumbnail?: MulterFile,
  ): Promise<ApiResponse<any>> {
    const post = await this.updatePostUseCase.execute({
      postId: id,
      userId: user.userId,
      ...dto,
      thumbnail,
      deleteThumbnail:
        dto.deleteThumbnail === 'true'
          ? true
          : dto.deleteThumbnail === 'false'
            ? false
            : undefined,
    });

    return ApiResponseUtil.success(
      this.mapPostToResponse(post),
      MessageKeys.POST_UPDATED_SUCCESS,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deletePost(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.deletePostUseCase.execute({ postId: id, userId: user.userId });
    return ApiResponseUtil.success(
      null,
      MessageKeys.POST_DELETED_SUCCESS,
    );
  }
}
