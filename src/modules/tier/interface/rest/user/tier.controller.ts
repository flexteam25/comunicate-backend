import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ListTiersUseCase } from '../../../application/handlers/user/list-tiers.use-case';
import { Tier } from '../../../domain/entities/tier.entity';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';

@Controller('api/tiers')
export class UserTierController {
  constructor(private readonly listTiersUseCase: ListTiersUseCase) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async listTiers(): Promise<ApiResponse<Tier[]>> {
    const tiers = await this.listTiersUseCase.execute();
    return ApiResponseUtil.success(tiers);
  }
}
