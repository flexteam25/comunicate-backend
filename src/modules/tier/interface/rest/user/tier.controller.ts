import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ListTiersUseCase } from '../../../application/handlers/user/list-tiers.use-case';
import { Tier } from '../../../domain/entities/tier.entity';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';

@Controller('api/tiers')
export class UserTierController {
  private readonly apiServiceUrl: string;

  constructor(
    private readonly listTiersUseCase: ListTiersUseCase,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async listTiers(): Promise<ApiResponse<Tier[]>> {
    const tiers = await this.listTiersUseCase.execute();
    return ApiResponseUtil.success(tiers.map((tier) => this.mapTierToResponse(tier)));
  }

  private mapTierToResponse(tier: Tier): any {
    return {
      id: tier.id,
      name: tier.name,
      description: tier.description || null,
      order: tier.order,
      iconUrl: buildFullUrl(this.apiServiceUrl, tier.iconUrl || null) || null,
      iconName: tier.iconName || null,
      isActive: tier.isActive,
      createdAt: tier.createdAt,
      updatedAt: tier.updatedAt,
    };
  }
}
