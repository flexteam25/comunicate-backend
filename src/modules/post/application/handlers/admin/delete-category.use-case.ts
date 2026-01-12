import { Injectable, Inject } from '@nestjs/common';
import { IPostCategoryRepository } from '../../../infrastructure/persistence/repositories/post-category.repository';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

export interface DeleteCategoryCommand {
  categoryId: string;
}

@Injectable()
export class DeleteCategoryUseCase {
  constructor(
    @Inject('IPostCategoryRepository')
    private readonly categoryRepository: IPostCategoryRepository,
  ) {}

  async execute(command: DeleteCategoryCommand): Promise<void> {
    const category = await this.categoryRepository.findById(command.categoryId);
    if (!category) {
      throw notFound(MessageKeys.CATEGORY_NOT_FOUND);
    }

    // Soft delete
    await this.categoryRepository.delete(command.categoryId);
  }
}
