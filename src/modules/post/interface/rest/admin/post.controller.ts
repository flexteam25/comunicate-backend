import {
  Controller,
  Get,
  Post,
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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MulterFile } from '../../../../../shared/services/upload';
import { AdminJwtAuthGuard } from '../../../../admin/infrastructure/guards/admin-jwt-auth.guard';
import { AdminPermissionGuard } from '../../../../admin/infrastructure/guards/admin-permission.guard';
import { RequirePermission } from '../../../../admin/infrastructure/decorators/require-permission.decorator';
import { CreatePostUseCase } from '../../../application/handlers/admin/create-post.use-case';
import { UpdatePostUseCase } from '../../../application/handlers/admin/update-post.use-case';
import { DeletePostUseCase } from '../../../application/handlers/admin/delete-post.use-case';
import { ListPostsUseCase } from '../../../application/handlers/admin/list-posts.use-case';
import { GetPostUseCase } from '../../../application/handlers/admin/get-post.use-case';
import { CreateCategoryUseCase } from '../../../application/handlers/admin/create-category.use-case';
import { UpdateCategoryUseCase } from '../../../application/handlers/admin/update-category.use-case';
import { DeleteCategoryUseCase } from '../../../application/handlers/admin/delete-category.use-case';
import { RestoreCategoryUseCase } from '../../../application/handlers/admin/restore-category.use-case';
import { ListCategoriesUseCase } from '../../../application/handlers/admin/list-categories.use-case';
import { CreatePostDto } from '../dto/create-post.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { ListAdminPostsQueryDto } from '../dto/list-admin-posts-query.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';
import {
  CurrentAdmin,
  CurrentAdminPayload,
} from '../../../../admin/infrastructure/decorators/current-admin.decorator';

@Controller('admin/posts')
@UseGuards(AdminJwtAuthGuard, AdminPermissionGuard)
export class AdminPostController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly createPostUseCase: CreatePostUseCase,
    private readonly updatePostUseCase: UpdatePostUseCase,
    private readonly deletePostUseCase: DeletePostUseCase,
    private readonly listPostsUseCase: ListPostsUseCase,
    private readonly getPostUseCase: GetPostUseCase,
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly deleteCategoryUseCase: DeleteCategoryUseCase,
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly configService: ConfigService,
    private readonly restoreCategoryUseCase: RestoreCategoryUseCase,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  private mapPostToResponse(post: any): any {
    return {
      id: post.id,
      userId: post.userId || null,
      userName: post.user?.displayName || null,
      userBadge: (() => {
        const activeBadge = post.user?.userBadges?.find(
          (ub: any) =>
            ub?.badge && ub.badge.isActive && !ub.badge.deletedAt && ub.active,
        );
        if (!activeBadge) return null;
        return {
          name: activeBadge.badge.name,
          iconUrl: buildFullUrl(this.apiServiceUrl, activeBadge.badge.iconUrl || null),
          color: activeBadge.badge.color || null,
          earnedAt: activeBadge.earnedAt,
        };
      })(),
      adminId: post.adminId || null,
      adminName: post.admin?.displayName || null,
      categoryId: post.categoryId,
      categoryName: post.category?.name || null,
      title: post.title,
      content: post.content,
      thumbnailUrl: post.thumbnailUrl
        ? buildFullUrl(this.apiServiceUrl, post.thumbnailUrl)
        : null,
      likeCount: post.likeCount || 0,
      isPinned: post.isPinned || false,
      isPublished: post.isPublished || false,
      publishedAt: post.publishedAt || null,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }

  private mapCategoryToResponse(category: any): any {
    return {
      id: category.id,
      name: category.name,
      description: category.description || null,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  // Categories
  @Get('categories')
  @RequirePermission('posts.manage')
  @HttpCode(HttpStatus.OK)
  async listCategories(): Promise<ApiResponse<any>> {
    const categories = await this.listCategoriesUseCase.execute();
    return ApiResponseUtil.success(
      categories.map((cat) => this.mapCategoryToResponse(cat)),
    );
  }

  @Post('categories')
  @RequirePermission('posts.manage')
  @HttpCode(HttpStatus.CREATED)
  async createCategory(@Body() dto: CreateCategoryDto): Promise<ApiResponse<any>> {
    const category = await this.createCategoryUseCase.execute(dto);
    return ApiResponseUtil.success(
      this.mapCategoryToResponse(category),
      'Category created successfully',
    );
  }

  @Put('categories/:id')
  @RequirePermission('posts.manage')
  @HttpCode(HttpStatus.OK)
  async updateCategory(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<ApiResponse<any>> {
    const category = await this.updateCategoryUseCase.execute({
      categoryId: id,
      ...dto,
    });
    return ApiResponseUtil.success(
      this.mapCategoryToResponse(category),
      'Category updated successfully',
    );
  }

  @Delete('categories/:id')
  @RequirePermission('posts.manage')
  @HttpCode(HttpStatus.OK)
  async deleteCategory(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.deleteCategoryUseCase.execute({ categoryId: id });
    return ApiResponseUtil.success({ message: 'Category deleted successfully' });
  }

  @Post('categories/:id/restore')
  @RequirePermission('posts.manage')
  @HttpCode(HttpStatus.OK)
  async restoreCategory(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<any>> {
    const category = await this.restoreCategoryUseCase.execute({
      categoryId: id,
    });
    return ApiResponseUtil.success(
      this.mapCategoryToResponse(category),
      'Category restored successfully',
    );
  }

  // Posts
  @Get()
  @RequirePermission('posts.manage')
  @HttpCode(HttpStatus.OK)
  async listPosts(@Query() query: ListAdminPostsQueryDto): Promise<ApiResponse<any>> {
    const result = await this.listPostsUseCase.execute({
      isPublished: query.isPublished,
      categoryId: query.categoryId,
      userId: query.userId,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      cursor: query.cursor,
      limit: query.limit,
    });

    return ApiResponseUtil.success({
      data: result.data.map((post) => this.mapPostToResponse(post)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Get(':id')
  @RequirePermission('posts.manage')
  @HttpCode(HttpStatus.OK)
  async getPost(@Param('id', new ParseUUIDPipe()) id: string): Promise<ApiResponse<any>> {
    const post = await this.getPostUseCase.execute({ postId: id });
    return ApiResponseUtil.success(this.mapPostToResponse(post));
  }

  @Post()
  @RequirePermission('posts.manage')
  @UseInterceptors(FileInterceptor('thumbnail'))
  @HttpCode(HttpStatus.CREATED)
  async createPost(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Body() dto: CreatePostDto,
    @UploadedFile() thumbnail?: MulterFile,
  ): Promise<ApiResponse<any>> {
    const post = await this.createPostUseCase.execute({
      adminId: admin.adminId,
      categoryId: dto.categoryId,
      title: dto.title,
      content: dto.content,
      thumbnail,
      isPinned: dto.isPinned,
      isPublished: dto.isPublished,
    });

    return ApiResponseUtil.success(
      this.mapPostToResponse(post),
      'Post created successfully',
    );
  }

  @Put(':id')
  @RequirePermission('posts.manage')
  @UseInterceptors(FileInterceptor('thumbnail'))
  @HttpCode(HttpStatus.OK)
  async updatePost(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePostDto,
    @UploadedFile() thumbnail?: MulterFile,
  ): Promise<ApiResponse<any>> {
    const post = await this.updatePostUseCase.execute({
      postId: id,
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
      'Post updated successfully',
    );
  }

  @Delete(':id')
  @RequirePermission('posts.manage')
  @HttpCode(HttpStatus.OK)
  async deletePost(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.deletePostUseCase.execute({ postId: id });
    return ApiResponseUtil.success({ message: 'Post deleted successfully' });
  }
}
