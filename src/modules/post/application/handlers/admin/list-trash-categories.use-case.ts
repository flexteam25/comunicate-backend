import { Injectable, Inject } from '@nestjs/common';
import { IPostCategoryRepository } from '../../../infrastructure/persistence/repositories/post-category.repository';
import { PostCategory } from '../../../domain/entities/post-category.entity';

@Injectable()
export class ListTrashCategoriesUseCase {
  constructor(
    @Inject('IPostCategoryRepository')
    private readonly categoryRepository: IPostCategoryRepository,
  ) {}

  async execute(): Promise<PostCategory[]> {
    return this.categoryRepository.findAllDeleted();
  }
}
