import { Injectable, Inject } from '@nestjs/common';
import { ISiteCategoryRepository } from '../../../infrastructure/persistence/repositories/site-category.repository';
import { SiteCategory } from '../../../domain/entities/site-category.entity';

@Injectable()
export class ListCategoriesUseCase {
  constructor(
    @Inject('ISiteCategoryRepository')
    private readonly categoryRepository: ISiteCategoryRepository,
  ) {}

  async execute(): Promise<SiteCategory[]> {
    // Only return active, non-deleted categories for users
    return this.categoryRepository.findAll(1);
  }
}
