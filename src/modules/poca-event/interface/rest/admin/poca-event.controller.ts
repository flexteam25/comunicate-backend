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
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AdminJwtAuthGuard } from '../../../../admin/infrastructure/guards/admin-jwt-auth.guard';
import { AdminPermissionGuard } from '../../../../admin/infrastructure/guards/admin-permission.guard';
import { RequirePermission } from '../../../../admin/infrastructure/decorators/require-permission.decorator';
import { ListPocaEventsUseCase } from '../../../application/handlers/user/list-poca-events.use-case';
import { GetPocaEventUseCase } from '../../../application/handlers/user/get-poca-event.use-case';
import { CreatePocaEventUseCase } from '../../../application/handlers/admin/create-poca-event.use-case';
import { UpdatePocaEventUseCase } from '../../../application/handlers/admin/update-poca-event.use-case';
import { DeletePocaEventUseCase } from '../../../application/handlers/admin/delete-poca-event.use-case';
import { AdminListPocaEventsUseCase } from '../../../application/handlers/admin/list-poca-events.use-case';
import { AdminGetPocaEventUseCase } from '../../../application/handlers/admin/get-poca-event.use-case';
import { CreatePocaEventDto } from '../dto/create-poca-event.dto';
import { UpdatePocaEventDto } from '../dto/update-poca-event.dto';
import { ListAdminPocaEventsQueryDto } from '../dto/list-admin-poca-events-query.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { MessageKeys } from '../../../../../shared/exceptions/exception-helpers';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';
import { MulterFile } from '../../../../../shared/services/upload';

@Controller('admin/poca-events')
@UseGuards(AdminJwtAuthGuard, AdminPermissionGuard)
export class AdminPocaEventController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly createPocaEventUseCase: CreatePocaEventUseCase,
    private readonly updatePocaEventUseCase: UpdatePocaEventUseCase,
    private readonly deletePocaEventUseCase: DeletePocaEventUseCase,
    private readonly adminListPocaEventsUseCase: AdminListPocaEventsUseCase,
    private readonly adminGetPocaEventUseCase: AdminGetPocaEventUseCase,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  private mapPocaEventToResponse(event: any): any {
    return {
      id: event.id,
      title: event.title,
      slug: event.slug || null,
      summary: event.summary || null,
      content: event.content,
      status: event.status,
      startsAt: event.startsAt || null,
      endsAt: event.endsAt || null,
      primaryBannerUrl:
        buildFullUrl(this.apiServiceUrl, event.primaryBannerUrl || null) || null,
      viewCount: event.viewCount || 0,
      banners: (event.banners || []).map((banner: any) => ({
        id: banner.id,
        imageUrl: buildFullUrl(this.apiServiceUrl, banner.imageUrl) || null,
        order: banner.order,
      })),
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }

  @Post()
  @RequirePermission('poca-events.manage')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'primaryBanner', maxCount: 1 },
      { name: 'banners', maxCount: 10 },
    ]),
  )
  async createPocaEvent(
    @Body() dto: CreatePocaEventDto,
    @UploadedFiles()
    files?: {
      primaryBanner?: MulterFile[];
      banners?: MulterFile[];
    },
  ): Promise<ApiResponse<any>> {
    // Parse banners order if provided
    let banners: Array<{ image: MulterFile; order: number }> | undefined;

    if (files?.banners && files.banners.length > 0) {
      let orders: number[] = [];
      if (dto.bannersOrder) {
        try {
          orders = JSON.parse(dto.bannersOrder);
          if (!Array.isArray(orders) || orders.length !== files.banners.length) {
            throw new BadRequestException(
              'Banners order array length must match number of banner files',
            );
          }
        } catch {
          throw new BadRequestException(
            'Invalid banners order format. Must be a valid JSON array of numbers',
          );
        }
      } else {
        // Default order: 0, 1, 2, ...
        orders = files.banners.map((_, index) => index);
      }

      banners = files.banners.map((image, index) => ({
        image,
        order: orders[index],
      }));
    }

    const event = await this.createPocaEventUseCase.execute({
      title: dto.title,
      slug: dto.slug,
      summary: dto.summary,
      content: dto.content,
      status: dto.status,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      primaryBanner: files?.primaryBanner?.[0],
      banners,
    });

    return ApiResponseUtil.success(
      this.mapPocaEventToResponse(event),
      'Event created successfully',
    );
  }

  @Put(':id')
  @RequirePermission('poca-events.manage')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'primaryBanner', maxCount: 1 },
      { name: 'banners', maxCount: 10 },
    ]),
  )
  async updatePocaEvent(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePocaEventDto,
    @UploadedFiles()
    files?: {
      primaryBanner?: MulterFile[];
      banners?: MulterFile[];
    },
  ): Promise<ApiResponse<any>> {
    // Parse banners order if provided
    let banners: Array<{ image: MulterFile; order: number }> | undefined;

    if (files?.banners && files.banners.length > 0) {
      let orders: number[] = [];
      if (dto.bannersOrder) {
        try {
          orders = JSON.parse(dto.bannersOrder);
          if (!Array.isArray(orders) || orders.length !== files.banners.length) {
            throw new BadRequestException(
              'Banners order array length must match number of banner files',
            );
          }
        } catch {
          throw new BadRequestException(
            'Invalid banners order format. Must be a valid JSON array of numbers',
          );
        }
      } else {
        // Default order: 0, 1, 2, ...
        orders = files.banners.map((_, index) => index);
      }

      banners = files.banners.map((image, index) => ({
        image,
        order: orders[index],
      }));
    }

    const event = await this.updatePocaEventUseCase.execute({
      eventId: id,
      title: dto.title,
      slug: dto.slug,
      summary: dto.summary,
      content: dto.content,
      status: dto.status,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      primaryBanner: files?.primaryBanner?.[0],
      deletePrimaryBanner: dto.deletePrimaryBanner === 'true',
      banners,
      deleteBanners: dto.deleteBanners === 'true',
    });

    return ApiResponseUtil.success(
      this.mapPocaEventToResponse(event),
      'Event updated successfully',
    );
  }

  @Delete(':id')
  @RequirePermission('poca-events.manage')
  @HttpCode(HttpStatus.OK)
  async deletePocaEvent(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.deletePocaEventUseCase.execute({ eventId: id });
    return ApiResponseUtil.success(
      null,
      MessageKeys.EVENT_DELETED_SUCCESS,
    );
  }

  @Get()
  @RequirePermission('poca-events.manage')
  @HttpCode(HttpStatus.OK)
  async listPocaEvents(
    @Query() query: ListAdminPocaEventsQueryDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.adminListPocaEventsUseCase.execute({
      status: query.status,
      search: query.search,
      cursor: query.cursor,
      limit: query.limit,
    });

    return ApiResponseUtil.success({
      data: result.data.map((event) => this.mapPocaEventToResponse(event)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Get(':id')
  @RequirePermission('poca-events.manage')
  @HttpCode(HttpStatus.OK)
  async getPocaEvent(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<any>> {
    const event = await this.adminGetPocaEventUseCase.execute({ eventId: id });
    return ApiResponseUtil.success(this.mapPocaEventToResponse(event));
  }
}
