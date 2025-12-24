import {
  Injectable,
  NotFoundException,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { IPostCategoryRepository } from '../../../infrastructure/persistence/repositories/post-category.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostCategory } from '../../../domain/entities/post-category.entity';

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
      throw new NotFoundException('Category not found');
    }

    // Check if already restored
    if (!category.deletedAt) {
      throw new BadRequestException('Category is not deleted');
    }

    // Restore the category
    await this.categoryRepository.restore(command.categoryId);

    // Return the restored category
    const restored = await this.categoryRepository.findById(command.categoryId);
    if (!restored) {
      throw new Error('Category not found after restore');
    }
    return restored;
  }
}
