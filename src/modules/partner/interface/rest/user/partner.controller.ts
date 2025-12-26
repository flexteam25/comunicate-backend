import { Controller, Get, Post, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../../shared/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../../shared/decorators/current-user.decorator';
import { GetMyPartnerRequestUseCase } from '../../../application/handlers/user/get-my-partner-request.use-case';
import { CreatePartnerRequestUseCase } from '../../../application/handlers/user/create-partner-request.use-case';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';

@Controller('api/partner')
@UseGuards(JwtAuthGuard)
export class PartnerController {
  constructor(
    private readonly getMyPartnerRequestUseCase: GetMyPartnerRequestUseCase,
    private readonly createPartnerRequestUseCase: CreatePartnerRequestUseCase,
  ) {}

  @Get('request')
  @HttpCode(HttpStatus.OK)
  async getMyPartnerRequest(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ApiResponse<any>> {
    const partnerRequest = await this.getMyPartnerRequestUseCase.execute({
      userId: user.userId,
    });

    return ApiResponseUtil.success({
      id: partnerRequest.id,
      userId: partnerRequest.userId,
      status: partnerRequest.status,
      adminId: partnerRequest.adminId || null,
      reviewedAt: partnerRequest.reviewedAt || null,
      rejectionReason: partnerRequest.rejectionReason || null,
      createdAt: partnerRequest.createdAt,
      updatedAt: partnerRequest.updatedAt,
    });
  }

  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  async createPartnerRequest(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ApiResponse<any>> {
    const partnerRequest = await this.createPartnerRequestUseCase.execute({
      userId: user.userId,
    });

    return ApiResponseUtil.success(
      {
        id: partnerRequest.id,
        userId: partnerRequest.userId,
        status: partnerRequest.status,
        adminId: partnerRequest.adminId || null,
        reviewedAt: partnerRequest.reviewedAt || null,
        rejectionReason: partnerRequest.rejectionReason || null,
        createdAt: partnerRequest.createdAt,
        updatedAt: partnerRequest.updatedAt,
      },
      'Partner request created successfully',
    );
  }
}
