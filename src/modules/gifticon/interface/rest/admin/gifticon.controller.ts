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
import { AdminJwtAuthGuard } from '../../../../admin/infrastructure/guards/admin-jwt-auth.guard';
import { AdminPermissionGuard } from '../../../../admin/infrastructure/guards/admin-permission.guard';
import { RequirePermission } from '../../../../admin/infrastructure/decorators/require-permission.decorator';
import { CreateGifticonUseCase } from '../../../application/handlers/admin/create-gifticon.use-case';
import { UpdateGifticonUseCase } from '../../../application/handlers/admin/update-gifticon.use-case';
import { DeleteGifticonUseCase } from '../../../application/handlers/admin/delete-gifticon.use-case';
import { AdminListGifticonsUseCase } from '../../../application/handlers/admin/list-gifticons.use-case';
import { AdminGetGifticonUseCase } from '../../../application/handlers/admin/get-gifticon.use-case';
import { ListRedemptionsUseCase } from '../../../application/handlers/admin/list-redemptions.use-case';
import { GetRedemptionDetailUseCase } from '../../../application/handlers/admin/get-redemption-detail.use-case';
import { ApproveRedemptionUseCase } from '../../../application/handlers/admin/approve-redemption.use-case';
import { RejectRedemptionUseCase } from '../../../application/handlers/admin/reject-redemption.use-case';
import {
  CurrentAdmin,
  CurrentAdminPayload,
} from '../../../../admin/infrastructure/decorators/current-admin.decorator';
import { CreateGifticonDto } from '../dto/create-gifticon.dto';
import { UpdateGifticonDto } from '../dto/update-gifticon.dto';
import { ListAdminGifticonsQueryDto } from '../dto/list-admin-gifticons-query.dto';
import { ListRedemptionsQueryDto } from '../dto/list-redemptions-query.dto';
import { RejectRedemptionDto } from '../dto/reject-redemption.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';
import { MulterFile } from '../../../../../shared/services/upload';

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
    private readonly listRedemptionsUseCase: ListRedemptionsUseCase,
    private readonly getRedemptionDetailUseCase: GetRedemptionDetailUseCase,
    private readonly approveRedemptionUseCase: ApproveRedemptionUseCase,
    private readonly rejectRedemptionUseCase: RejectRedemptionUseCase,
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
      typeColor: gifticon.typeColor || null,
      startsAt: gifticon.startsAt || null,
      endsAt: gifticon.endsAt || null,
      imageUrl: buildFullUrl(this.apiServiceUrl, gifticon.imageUrl || null) || null,
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
    const gifticon = await this.createGifticonUseCase.execute({
      title: dto.title,
      slug: dto.slug,
      summary: dto.summary,
      content: dto.content,
      status: dto.status,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      image: file,
      amount: dto.amount,
      typeColor: dto.typeColor,
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
    const gifticon = await this.updateGifticonUseCase.execute({
      gifticonId: id,
      title: dto.title,
      slug: dto.slug,
      summary: dto.summary,
      content: dto.content,
      status: dto.status,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      image: file,
      deleteImage: dto.deleteImage === 'true',
      amount: dto.amount,
      typeColor: dto.typeColor,
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

  @Get('redemptions')
  @RequirePermission('gifticons.manage')
  @HttpCode(HttpStatus.OK)
  async listRedemptions(
    @Query() query: ListRedemptionsQueryDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.listRedemptionsUseCase.execute({
      status: query.status,
      userId: query.userId,
      gifticonId: query.gifticonId,
      cursor: query.cursor,
      limit: query.limit || 20,
    });

    return ApiResponseUtil.success({
      data: result.data.map((redemption) => ({
        id: redemption.id,
        userId: redemption.userId,
        user: redemption.user
          ? {
              id: redemption.user.id,
              email: redemption.user.email,
              displayName: redemption.user.displayName || null,
            }
          : null,
        gifticonId: redemption.gifticonId,
        gifticon: redemption.gifticon
          ? this.mapGifticonToResponse(redemption.gifticon)
          : redemption.gifticonSnapshot
            ? {
                title: redemption.gifticonSnapshot.title,
                amount: redemption.gifticonSnapshot.amount,
                imageUrl: redemption.gifticonSnapshot.imageUrl
                  ? buildFullUrl(this.apiServiceUrl, redemption.gifticonSnapshot.imageUrl)
                  : null,
                summary: redemption.gifticonSnapshot.summary || null,
                typeColor: redemption.gifticonSnapshot.typeColor || null,
              }
            : null,
        pointsUsed: redemption.pointsUsed,
        status: redemption.status,
        redemptionCode: redemption.redemptionCode || null,
        cancelledAt: redemption.cancelledAt || null,
        cancellationReason: redemption.cancellationReason || null,
        createdAt: redemption.createdAt,
        updatedAt: redemption.updatedAt,
      })),
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

  @Get('redemptions/:id')
  @RequirePermission('gifticons.manage')
  @HttpCode(HttpStatus.OK)
  async getRedemptionDetail(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<any>> {
    const redemption = await this.getRedemptionDetailUseCase.execute({
      redemptionId: id,
    });

    return ApiResponseUtil.success({
      id: redemption.id,
      userId: redemption.userId,
      user: redemption.user
        ? {
            id: redemption.user.id,
            email: redemption.user.email,
            displayName: redemption.user.displayName || null,
          }
        : null,
      gifticonId: redemption.gifticonId,
      gifticon: redemption.gifticon
        ? this.mapGifticonToResponse(redemption.gifticon)
        : redemption.gifticonSnapshot
          ? {
              title: redemption.gifticonSnapshot.title,
              amount: redemption.gifticonSnapshot.amount,
              imageUrl: redemption.gifticonSnapshot.imageUrl
                ? buildFullUrl(this.apiServiceUrl, redemption.gifticonSnapshot.imageUrl)
                : null,
              summary: redemption.gifticonSnapshot.summary || null,
            }
          : null,
      pointsUsed: redemption.pointsUsed,
      status: redemption.status,
      redemptionCode: redemption.redemptionCode || null,
      cancelledAt: redemption.cancelledAt || null,
      cancellationReason: redemption.cancellationReason || null,
      createdAt: redemption.createdAt,
      updatedAt: redemption.updatedAt,
    });
  }

  @Post('redemptions/:id/approve')
  @RequirePermission('gifticons.manage')
  @HttpCode(HttpStatus.OK)
  async approveRedemption(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<any>> {
    const redemption = await this.approveRedemptionUseCase.execute({
      redemptionId: id,
    });

    return ApiResponseUtil.success(
      {
        id: redemption.id,
        userId: redemption.userId,
        user: redemption.user
          ? {
              id: redemption.user.id,
              email: redemption.user.email,
              displayName: redemption.user.displayName || null,
            }
          : null,
        gifticonId: redemption.gifticonId,
        gifticon: redemption.gifticon
          ? this.mapGifticonToResponse(redemption.gifticon)
          : redemption.gifticonSnapshot
            ? {
                title: redemption.gifticonSnapshot.title,
                amount: redemption.gifticonSnapshot.amount,
                imageUrl: redemption.gifticonSnapshot.imageUrl
                  ? buildFullUrl(this.apiServiceUrl, redemption.gifticonSnapshot.imageUrl)
                  : null,
                summary: redemption.gifticonSnapshot.summary || null,
                typeColor: redemption.gifticonSnapshot.typeColor || null,
              }
            : null,
        pointsUsed: redemption.pointsUsed,
        status: redemption.status,
        redemptionCode: redemption.redemptionCode || null,
        cancelledAt: redemption.cancelledAt || null,
        cancellationReason: redemption.cancellationReason || null,
        createdAt: redemption.createdAt,
        updatedAt: redemption.updatedAt,
      },
      'Redemption approved successfully',
    );
  }

  @Post('redemptions/:id/reject')
  @RequirePermission('gifticons.manage')
  @HttpCode(HttpStatus.OK)
  async rejectRedemption(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Body() dto: RejectRedemptionDto,
  ): Promise<ApiResponse<any>> {
    const redemption = await this.rejectRedemptionUseCase.execute({
      redemptionId: id,
      adminId: admin.adminId,
      reason: dto.reason,
    });

    return ApiResponseUtil.success(
      {
        id: redemption.id,
        userId: redemption.userId,
        user: redemption.user
          ? {
              id: redemption.user.id,
              email: redemption.user.email,
              displayName: redemption.user.displayName || null,
            }
          : null,
        gifticonId: redemption.gifticonId,
        gifticon: redemption.gifticon
          ? this.mapGifticonToResponse(redemption.gifticon)
          : redemption.gifticonSnapshot
            ? {
                title: redemption.gifticonSnapshot.title,
                amount: redemption.gifticonSnapshot.amount,
                imageUrl: redemption.gifticonSnapshot.imageUrl
                  ? buildFullUrl(this.apiServiceUrl, redemption.gifticonSnapshot.imageUrl)
                  : null,
                summary: redemption.gifticonSnapshot.summary || null,
                typeColor: redemption.gifticonSnapshot.typeColor || null,
              }
            : null,
        pointsUsed: redemption.pointsUsed,
        status: redemption.status,
        redemptionCode: redemption.redemptionCode || null,
        cancelledAt: redemption.cancelledAt || null,
        cancellationReason: redemption.cancellationReason || null,
        createdAt: redemption.createdAt,
        updatedAt: redemption.updatedAt,
      },
      'Redemption rejected successfully',
    );
  }
}
