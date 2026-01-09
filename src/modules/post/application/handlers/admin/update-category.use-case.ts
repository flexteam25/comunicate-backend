import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PostCategory } from '../../../domain/entities/post-category.entity';
import { IPostCategoryRepository } from '../../../infrastructure/persistence/repositories/post-category.repository';
import {
  isValidPostCategorySpecialKey,
  POST_CATEGORY_SPECIAL_KEYS,
} from '../../../domain/constants/post-category-special-keys';

export interface UpdateCategoryCommand {
  categoryId: string;
  name?: string;
  nameKo?: string;
  description?: string;
  showMain?: boolean;
  specialKey?: string | null;
}

@Injectable()
export class UpdateCategoryUseCase {
  constructor(
    @Inject('IPostCategoryRepository')
    private readonly categoryRepository: IPostCategoryRepository,
  ) {}

  async execute(command: UpdateCategoryCommand): Promise<PostCategory> {
    const category = await this.categoryRepository.findById(command.categoryId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check name uniqueness if name is being updated
    if (command.name && command.name !== category.name) {
      const existing = await this.categoryRepository.findByName(command.name);
      if (existing) {
        throw new BadRequestException('Category with this name already exists');
      }
    }

    // Validate specialKey if provided
    if (command.specialKey !== undefined) {
      if (command.specialKey !== null && !isValidPostCategorySpecialKey(command.specialKey)) {
        throw new BadRequestException(
          `specialKey must be one of: ${POST_CATEGORY_SPECIAL_KEYS.join(', ')}`,
        );
      }
    }

    const updateData: Partial<PostCategory> = {};
    if (command.name !== undefined) updateData.name = command.name;
    if (command.nameKo !== undefined) updateData.nameKo = command.nameKo || null;
    if (command.description !== undefined)
      updateData.description = command.description || null;
    if (command.showMain !== undefined) updateData.showMain = command.showMain;
    if (command.specialKey !== undefined)
      updateData.specialKey = command.specialKey || null;

    return this.categoryRepository.update(command.categoryId, updateData);
  }
}
