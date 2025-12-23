import { Injectable, Inject } from '@nestjs/common';
import { PostCategory } from '../../../domain/entities/post-category.entity';
import { IPostCategoryRepository } from '../../../infrastructure/persistence/repositories/post-category.repository';

@Injectable()
export class ListCategoriesUseCase {
  constructor(
    @Inject('IPostCategoryRepository')
    private readonly categoryRepository: IPostCategoryRepository,
  ) {}

  async execute(): Promise<PostCategory[]> {
    return this.categoryRepository.findAll();
  }
}
