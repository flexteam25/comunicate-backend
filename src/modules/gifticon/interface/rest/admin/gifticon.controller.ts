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
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminJwtAuthGuard } from '../../../../admin/infrastructure/guards/admin-jwt-auth.guard';
import { AdminPermissionGuard } from '../../../../admin/infrastructure/guards/admin-permission.guard';
import { RequirePermission } from '../../../../admin/infrastructure/decorators/require-permission.decorator';
import { CreateGifticonUseCase } from '../../../application/handlers/admin/create-gifticon.use-case';
import { UpdateGifticonUseCase } from '../../../application/handlers/admin/update-gifticon.use-case';
import { DeleteGifticonUseCase } from '../../../application/handlers/admin/delete-gifticon.use-case';
import { AdminListGifticonsUseCase } from '../../../application/handlers/admin/list-gifticons.use-case';
import { AdminGetGifticonUseCase } from '../../../application/handlers/admin/get-gifticon.use-case';
import { CreateGifticonDto } from '../dto/create-gifticon.dto';
import { UpdateGifticonDto } from '../dto/update-gifticon.dto';
import { ListAdminGifticonsQueryDto } from '../dto/list-admin-gifticons-query.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';
import { UploadService, MulterFile } from '../../../../../shared/services/upload';

@Controller('admin/gifticons')
@UseGuards(AdminJwtAuthGuard, AdminPermissionGuard)
export class AdminGifticonController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly createGifticonUseCase: CreateGifticonUseCase,
    private readonly updateGifticonUseCase: UpdateGifticonUseCase,
    private readonly deleteGifticonUseCase: DeleteGifticonUseCase,
    private readonly adminListGifticonsUseCase: AdminListGifticonsUseCase,
    private readonly adminGetGifticonUseCase: AdminGetGifticonUseCase,
    private readonly uploadService: UploadService,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  private mapGifticonToResponse(gifticon: any): any {
    return {
      id: gifticon.id,
      title: gifticon.title,
      slug: gifticon.slug || null,
      summary: gifticon.summary || null,
      content: gifticon.content,
      status: gifticon.status,
      amount: gifticon.amount,
      startsAt: gifticon.startsAt || null,
      endsAt: gifticon.endsAt || null,
      imageUrl: buildFullUrl(
        this.apiServiceUrl,
        gifticon.imageUrl || null,
      ) || null,
      createdAt: gifticon.createdAt,
      updatedAt: gifticon.updatedAt,
    };
  }

  @Post()
  @RequirePermission('gifticons.manage')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('image'))
  async createGifticon(
    @Body() dto: CreateGifticonDto,
    @UploadedFile() file?: MulterFile,
  ): Promise<ApiResponse<any>> {
    let imageUrl: string | undefined;

    // Upload image if provided
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        throw new BadRequestException('Image file size exceeds 5MB');
      }
      if (!/(jpg|jpeg|png|webp)$/i.test(file.mimetype)) {
        throw new BadRequestException(
          'Invalid image file type. Allowed: jpg, jpeg, png, webp',
        );
      }
      const uploadResult = await this.uploadService.uploadImage(file, {
        folder: 'gifticons',
      });
      imageUrl = uploadResult.relativePath;
    }

    const gifticon = await this.createGifticonUseCase.execute({
      title: dto.title,
      slug: dto.slug,
      summary: dto.summary,
      content: dto.content,
      status: dto.status,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      imageUrl,
      amount: dto.amount,
    });

    return ApiResponseUtil.success(
      this.mapGifticonToResponse(gifticon),
      'Gifticon created successfully',
    );
  }

  @Put(':id')
  @RequirePermission('gifticons.manage')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image'))
  async updateGifticon(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateGifticonDto,
    @UploadedFile() file?: MulterFile,
  ): Promise<ApiResponse<any>> {
    let imageUrl: string | undefined;

    // Handle deletion flag
    if (dto.deleteImage === 'true') {
      imageUrl = null;
    } else if (file) {
      // Upload new image if provided
      if (file.size > 5 * 1024 * 1024) {
        throw new BadRequestException('Image file size exceeds 5MB');
      }
      if (!/(jpg|jpeg|png|webp)$/i.test(file.mimetype)) {
        throw new BadRequestException(
          'Invalid image file type. Allowed: jpg, jpeg, png, webp',
        );
      }
      const uploadResult = await this.uploadService.uploadImage(file, {
        folder: 'gifticons',
      });
      imageUrl = uploadResult.relativePath;
    }

    const gifticon = await this.updateGifticonUseCase.execute({
      gifticonId: id,
      title: dto.title,
      slug: dto.slug,
      summary: dto.summary,
      content: dto.content,
      status: dto.status,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      imageUrl: imageUrl !== undefined ? imageUrl : undefined,
      amount: dto.amount,
    });

    return ApiResponseUtil.success(
      this.mapGifticonToResponse(gifticon),
      'Gifticon updated successfully',
    );
  }

  @Delete(':id')
  @RequirePermission('gifticons.manage')
  @HttpCode(HttpStatus.OK)
  async deleteGifticon(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.deleteGifticonUseCase.execute({ gifticonId: id });
    return ApiResponseUtil.success({ message: 'Gifticon deleted successfully' });
  }

  @Get()
  @RequirePermission('gifticons.manage')
  @HttpCode(HttpStatus.OK)
  async listGifticons(
    @Query() query: ListAdminGifticonsQueryDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.adminListGifticonsUseCase.execute({
      status: query.status,
      search: query.search,
      cursor: query.cursor,
      limit: query.limit,
    });

    return ApiResponseUtil.success({
      data: result.data.map((gifticon) => this.mapGifticonToResponse(gifticon)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Get(':id')
  @RequirePermission('gifticons.manage')
  @HttpCode(HttpStatus.OK)
  async getGifticon(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<any>> {
    const gifticon = await this.adminGetGifticonUseCase.execute({ gifticonId: id });
    return ApiResponseUtil.success(this.mapGifticonToResponse(gifticon));
  }
}
