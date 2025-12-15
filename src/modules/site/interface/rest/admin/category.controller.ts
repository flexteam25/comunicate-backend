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
} from '@nestjs/common';
import { CreateCategoryUseCase } from '../../../application/handlers/admin/create-category.use-case';
import { UpdateCategoryUseCase } from '../../../application/handlers/admin/update-category.use-case';
import { DeleteCategoryUseCase } from '../../../application/handlers/admin/delete-category.use-case';
import { ListCategoriesUseCase } from '../../../application/handlers/admin/list-categories.use-case';
import { RestoreCategoryUseCase } from '../../../application/handlers/admin/restore-category.use-case';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
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
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('site.update')
  async createCategory(
    @Body() dto: CreateCategoryDto,
  ): Promise<ApiResponse<SiteCategory>> {
    const category = await this.createCategoryUseCase.execute(dto);
    return ApiResponseUtil.success(category, 'Category created successfully');
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.view')
  async listCategories(): Promise<ApiResponse<SiteCategory[]>> {
    const categories = await this.listCategoriesUseCase.execute();
    return ApiResponseUtil.success(categories);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.update')
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<ApiResponse<SiteCategory>> {
    const category = await this.updateCategoryUseCase.execute({ categoryId: id, ...dto });
    return ApiResponseUtil.success(category, 'Category updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.delete')
  async deleteCategory(
    @Param('id') id: string,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.deleteCategoryUseCase.execute({ categoryId: id });
    return ApiResponseUtil.success({ message: 'Category deleted successfully' });
  }

  @Put('/restore/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('site.update')
  async restoreCategory(
    @Param('id') id: string,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.restoreCategoryUseCase.execute({ categoryId: id });
    return ApiResponseUtil.success({ message: 'Category restored successfully' });
  }
}
