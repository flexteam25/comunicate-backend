import { Module } from '@nestjs/common';
import { PostPersistenceModule } from './post-persistence.module';
import { ServicesModule } from '../../shared/services/services.module';
import { UploadModule } from '../../shared/services/upload';
import { UserTokenRepositoryModule } from '../auth/infrastructure/persistence/user-token-repository.module';
import { AdminGuardsModule } from '../admin/infrastructure/guards/admin-guards.module';

// Use Cases
import { CreatePostUseCase } from './application/handlers/admin/create-post.use-case';
import { UpdatePostUseCase } from './application/handlers/admin/update-post.use-case';
import { DeletePostUseCase } from './application/handlers/admin/delete-post.use-case';
import { ListPostsUseCase } from './application/handlers/admin/list-posts.use-case';
import { CreateCategoryUseCase } from './application/handlers/admin/create-category.use-case';
import { UpdateCategoryUseCase } from './application/handlers/admin/update-category.use-case';
import { DeleteCategoryUseCase } from './application/handlers/admin/delete-category.use-case';
import { RestoreCategoryUseCase } from './application/handlers/admin/restore-category.use-case';
import { ListCategoriesUseCase } from './application/handlers/admin/list-categories.use-case';
import { ListPublicPostsUseCase } from './application/handlers/user/list-posts.use-case';
import { GetPostUseCase as GetPublicPostUseCase } from './application/handlers/user/get-post.use-case';
import { GetPostUseCase } from './application/handlers/admin/get-post.use-case';
import { ReactToPostUseCase } from './application/handlers/user/react-to-post.use-case';
import { DeleteReactionUseCase } from './application/handlers/user/delete-reaction.use-case';
import { AddCommentUseCase } from './application/handlers/user/add-comment.use-case';
import { DeleteCommentUseCase } from './application/handlers/user/delete-comment.use-case';
import { ListCommentsUseCase } from './application/handlers/user/list-comments.use-case';
import { CreatePostUseCase as UserCreatePostUseCase } from './application/handlers/user/create-post.use-case';
import { UpdatePostUseCase as UserUpdatePostUseCase } from './application/handlers/user/update-post.use-case';
import { DeletePostUseCase as UserDeletePostUseCase } from './application/handlers/user/delete-post.use-case';

// Controllers
import { AdminPostController } from './interface/rest/admin/post.controller';
import { PostController } from './interface/rest/user/post.controller';

@Module({
  imports: [
    PostPersistenceModule,
    ServicesModule,
    UploadModule.register({ storageType: 'local' }),
    UserTokenRepositoryModule,
    AdminGuardsModule,
  ],
  controllers: [AdminPostController, PostController],
  providers: [
    CreatePostUseCase,
    UpdatePostUseCase,
    DeletePostUseCase,
    ListPostsUseCase,
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
    RestoreCategoryUseCase,
    ListCategoriesUseCase,
    ListPublicPostsUseCase,
    GetPostUseCase,
    GetPublicPostUseCase,
    ReactToPostUseCase,
    AddCommentUseCase,
    DeleteReactionUseCase,
    DeleteCommentUseCase,
    ListCommentsUseCase,
    UserCreatePostUseCase,
    UserUpdatePostUseCase,
    UserDeletePostUseCase,
  ],
  exports: [],
})
export class PostModule {}
