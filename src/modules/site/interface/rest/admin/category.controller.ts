import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CreateCategoryUseCase } from '../../../application/handlers/admin/create-category.use-case';
import { UpdateCategoryUseCase } from '../../../application/handlers/admin/update-category.use-case';
import { DeleteCategoryUseCase } from '../../../application/handlers/admin/delete-category.use-case';
import { ListCategoriesUseCase } from '../../../application/handlers/admin/list-categories.use-case';
import { RestoreCategoryUseCase } from '../../../application/handlers/admin/restore-category.use-case';
import { ListTrashCategoriesUseCase } from '../../../application/handlers/admin/list-trash-categories.use-case';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { MessageKeys } from '../../../../../shared/exceptions/exception-helpers';
import { AdminJwtAuthGuard } from '../../../../admin/infrastructure/guards/admin-jwt-auth.guard';
import { AdminPermissionGuard } from '../../../../admin/infrastructure/guards/admin-permission.guard';
import { RequirePermission } from '../../../../admin/infrastructure/decorators/require-permission.decorator';
import { SiteCategory } from '../../../domain/entities/site-category.entity';

@Controller('admin/site-categories')
@UseGuards(AdminJwtAuthGuard, AdminPermissionGuard)
export class AdminCategoryController {
  constructor(
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly deleteCategoryUseCase: DeleteCategoryUseCase,
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly restoreCategoryUseCase: RestoreCategoryUseCase,
    private readonly listTrashCategoriesUseCase: ListTrashCategoriesUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('site.create')
  async createCategory(
    @Body() dto: CreateCategoryDto,
  ): Promise<ApiResponse<SiteCategory>> {
    const category = await this.createCategoryUseCase.execute(dto);
    return ApiResponseUtil.success(category, MessageKeys.CATEGORY_CREATED_SUCCESS);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.view')
  async listCategories(): Promise<ApiResponse<SiteCategory[]>> {
    const categories = await this.listCategoriesUseCase.execute();
    return ApiResponseUtil.success(categories);
  }

  @Get('trash')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.view')
  async listTrashCategories(): Promise<ApiResponse<SiteCategory[]>> {
    const categories = await this.listTrashCategoriesUseCase.execute();
    return ApiResponseUtil.success(categories);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.update')
  async updateCategory(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<ApiResponse<SiteCategory>> {
    const category = await this.updateCategoryUseCase.execute({
      categoryId: id,
      ...dto,
    });
    return ApiResponseUtil.success(category, MessageKeys.CATEGORY_UPDATED_SUCCESS);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.delete')
  async deleteCategory(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.deleteCategoryUseCase.execute({ categoryId: id });
    return ApiResponseUtil.success(
      null,
      MessageKeys.CATEGORY_DELETED_SUCCESS,
    );
  }

  @Put('/restore/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.update')
  async restoreCategory(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.restoreCategoryUseCase.execute({ categoryId: id });
    return ApiResponseUtil.success(
      null,
      MessageKeys.CATEGORY_RESTORED_SUCCESS,
    );
  }
}
