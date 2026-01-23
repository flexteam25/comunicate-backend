import { Injectable, Inject } from '@nestjs/common';
import { PostCategory } from '../../../domain/entities/post-category.entity';
import { IPostCategoryRepository } from '../../../infrastructure/persistence/repositories/post-category.repository';
import {
  isValidPostCategorySpecialKey,
  POST_CATEGORY_SPECIAL_KEYS,
} from '../../../domain/constants/post-category-special-keys';
import { badRequest } from '../../../../../shared/exceptions/exception-helpers';
import { MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

export interface CreateCategoryCommand {
  name: string;
  nameKo?: string;
  description?: string;
  showMain?: boolean;
  isPointBanner?: boolean;
  orderInMain?: number;
  specialKey?: string | null;
  order: number;
  adminCreateOnly: boolean;
  point?: number;
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
      throw badRequest(MessageKeys.CATEGORY_NAME_ALREADY_EXISTS);
    }

    // Validate specialKey if provided
    if (command.specialKey !== undefined && command.specialKey !== null) {
      if (!isValidPostCategorySpecialKey(command.specialKey)) {
        throw badRequest(MessageKeys.INVALID_SPECIAL_KEY, {
          allowedKeys: POST_CATEGORY_SPECIAL_KEYS.join(', '),
        });
      }
    }

    return this.categoryRepository.create({
      name: command.name,
      nameKo: command.nameKo,
      description: command.description,
      showMain: command.showMain ?? false,
      isPointBanner: command.isPointBanner ?? false,
      specialKey: command.specialKey || null,
      order: command.order,
      orderInMain: command.orderInMain ?? null,
      adminCreateOnly: command.adminCreateOnly,
      point: command.point ?? 0,
    });
  }
}
