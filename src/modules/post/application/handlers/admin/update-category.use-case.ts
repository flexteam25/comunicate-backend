import { Injectable, Inject } from '@nestjs/common';
import { PostCategory } from '../../../domain/entities/post-category.entity';
import { IPostCategoryRepository } from '../../../infrastructure/persistence/repositories/post-category.repository';
import {
  isValidPostCategorySpecialKey,
  POST_CATEGORY_SPECIAL_KEYS,
} from '../../../domain/constants/post-category-special-keys';
import { notFound, badRequest } from '../../../../../shared/exceptions/exception-helpers';
import { MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

export interface UpdateCategoryCommand {
  categoryId: string;
  name?: string;
  nameKo?: string;
  description?: string;
  showMain?: boolean;
  isPointBanner?: boolean;
  specialKey?: string | null;
  order?: number;
  orderInMain?: number;
  adminCreateOnly: boolean;
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
      throw notFound(MessageKeys.CATEGORY_NOT_FOUND);
    }

    // Check name uniqueness if name is being updated
    if (command.name && command.name !== category.name) {
      const existing = await this.categoryRepository.findByName(command.name);
      if (existing) {
        throw badRequest(MessageKeys.CATEGORY_NAME_ALREADY_EXISTS);
      }
    }

    // Validate specialKey if provided
    if (command.specialKey !== undefined) {
      if (
        command.specialKey !== null &&
        !isValidPostCategorySpecialKey(command.specialKey)
      ) {
        throw badRequest(MessageKeys.INVALID_SPECIAL_KEY, {
          allowedKeys: POST_CATEGORY_SPECIAL_KEYS.join(', '),
        });
      }
    }

    const updateData: Partial<PostCategory> = {};
    if (command.name !== undefined) updateData.name = command.name;
    if (command.nameKo !== undefined) updateData.nameKo = command.nameKo || null;
    if (command.description !== undefined)
      updateData.description = command.description || null;
    if (command.showMain !== undefined) updateData.showMain = command.showMain;
    if (command.isPointBanner !== undefined) updateData.isPointBanner = command.isPointBanner;
    if (command.specialKey !== undefined)
      updateData.specialKey = command.specialKey || null;
    // Only update order if provided and not null/undefined
    if (command.order !== undefined && command.order !== null) {
      updateData.order = command.order;
    }
    if (command.orderInMain !== undefined && command.orderInMain !== null) {
      updateData.orderInMain = command.orderInMain;
    }
    if (command.adminCreateOnly !== undefined) {
      updateData.adminCreateOnly = command.adminCreateOnly;
    }

    return this.categoryRepository.update(command.categoryId, updateData);
  }
}
