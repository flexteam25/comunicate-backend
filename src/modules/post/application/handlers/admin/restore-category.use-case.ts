import { Injectable, Inject } from '@nestjs/common';
import { IPostCategoryRepository } from '../../../infrastructure/persistence/repositories/post-category.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostCategory } from '../../../domain/entities/post-category.entity';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface RestoreCategoryCommand {
  categoryId: string;
}

@Injectable()
export class RestoreCategoryUseCase {
  constructor(
    @Inject('IPostCategoryRepository')
    private readonly categoryRepository: IPostCategoryRepository,
    @InjectRepository(PostCategory)
    private readonly repository: Repository<PostCategory>,
  ) {}

  async execute(command: RestoreCategoryCommand): Promise<PostCategory> {
    // Check if category exists (including soft-deleted ones)
    const category = await this.repository.findOne({
      where: { id: command.categoryId },
      withDeleted: true,
    });

    if (!category) {
      throw notFound(MessageKeys.CATEGORY_NOT_FOUND);
    }

    // Check if already restored
    if (!category.deletedAt) {
      throw badRequest(MessageKeys.CATEGORY_NOT_DELETED);
    }

    // Restore the category
    await this.categoryRepository.restore(command.categoryId);

    // Return the restored category
    const restored = await this.categoryRepository.findById(command.categoryId);
    if (!restored) {
      throw notFound(MessageKeys.POST_CATEGORY_NOT_FOUND_AFTER_RESTORE);
    }
    return restored;
  }
}
