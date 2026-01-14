import { IsIn, IsOptional } from 'class-validator';

export class ListPostCategoriesQueryDto {
  @IsOptional({ message: 'SORTBY_OPTIONAL' })
  @IsIn(['order', 'orderInMain'])
  sortBy?: 'order' | 'orderInMain';

  @IsOptional({ message: 'SORTORDER_OPTIONAL' })
  @IsIn(['ASC', 'DESC'])
  sortDir?: 'ASC' | 'DESC';
}
