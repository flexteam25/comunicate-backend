import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { PostCategory } from '../../../domain/entities/post-category.entity';
import { IPostCategoryRepository } from '../../../infrastructure/persistence/repositories/post-category.repository';

export interface CreateCategoryCommand {
  name: string;
  nameKo?: string;
  description?: string;
  showMain?: boolean;
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

    return this.categoryRepository.create({
      name: command.name,
      nameKo: command.nameKo,
      description: command.description,
      showMain: command.showMain ?? false,
    });
  }
}
