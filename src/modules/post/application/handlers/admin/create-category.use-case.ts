import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { PostCategory } from '../../../domain/entities/post-category.entity';
import { IPostCategoryRepository } from '../../../infrastructure/persistence/repositories/post-category.repository';
import {
  isValidPostCategorySpecialKey,
  POST_CATEGORY_SPECIAL_KEYS,
} from '../../../domain/constants/post-category-special-keys';

export interface CreateCategoryCommand {
  name: string;
  nameKo?: string;
  description?: string;
  showMain?: boolean;
  specialKey?: string | null;
  order: number;
}

@Injectable()
export class CreateCategoryUseCase {
  constructor(
    @Inject('IPostCategoryRepository')
    private readonly categoryRepository: IPostCategoryRepository,
  ) {}

  async execute(command: CreateCategoryCommand): Promise<PostCategory> {
    const existing = await this.categoryRepository.findByName(command.name);
    if (existing) {
      throw new BadRequestException('Category with this name already exists');
    }

    // Validate specialKey if provided
    if (command.specialKey !== undefined && command.specialKey !== null) {
      if (!isValidPostCategorySpecialKey(command.specialKey)) {
        throw new BadRequestException(
          `specialKey must be one of: ${POST_CATEGORY_SPECIAL_KEYS.join(', ')}`,
        );
      }
    }

    return this.categoryRepository.create({
      name: command.name,
      nameKo: command.nameKo,
      description: command.description,
      showMain: command.showMain ?? false,
      specialKey: command.specialKey || null,
      order: command.order,
    });
  }
}
