import { Controller, Get, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AdminJwtAuthGuard } from '../../../../admin/infrastructure/guards/admin-jwt-auth.guard';
import { AdminPermissionGuard } from '../../../../admin/infrastructure/guards/admin-permission.guard';
import { RequirePermission } from '../../../../admin/infrastructure/decorators/require-permission.decorator';
import { ListPointTransactionsUseCase } from '../../../application/handlers/admin/list-point-transactions.use-case';
import { AdminListPointTransactionsQueryDto } from '../dto/admin-list-point-transactions-query.dto';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';

@Controller('admin/points/transactions')
@UseGuards(AdminJwtAuthGuard, AdminPermissionGuard)
export class AdminPointTransactionController {
  constructor(
    private readonly listPointTransactionsUseCase: ListPointTransactionsUseCase,
  ) {}

  @Get()
  @RequirePermission('points.transaction.view')
  @HttpCode(HttpStatus.OK)
  async listPointTransactions(
    @Query() query: AdminListPointTransactionsQueryDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.listPointTransactionsUseCase.execute({
      userName: query.userName,
      type: query.type || 'all',
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      cursor: query.cursor,
      limit: query.limit || 20,
    });

    return ApiResponseUtil.success({
      data: result.data.map((transaction) => ({
        id: transaction.id,
        userId: transaction.userId,
        user: transaction.user
          ? {
              id: transaction.user.id,
              email: transaction.user.email,
              displayName: transaction.user.displayName || null,
            }
          : null,
        type: transaction.type,
        amount: transaction.amount,
        balanceAfter: transaction.balanceAfter,
        category: transaction.category,
        referenceType: transaction.referenceType || null,
        referenceId: transaction.referenceId || null,
        description: transaction.description || null,
        metadata: transaction.metadata || null,
        createdAt: transaction.createdAt,
      })),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }
}
