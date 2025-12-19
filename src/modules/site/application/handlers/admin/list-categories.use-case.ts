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
    return this.categoryRepository.findAll();
  }
}
