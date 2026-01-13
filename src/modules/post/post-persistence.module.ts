import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './domain/entities/post.entity';
import { PostCategory } from './domain/entities/post-category.entity';
import { PostComment } from './domain/entities/post-comment.entity';
import { PostCommentImage } from './domain/entities/post-comment-image.entity';
import { PostReaction } from './domain/entities/post-reaction.entity';
import { PostCommentReaction } from './domain/entities/post-comment-reaction.entity';
import { PostView } from './domain/entities/post-view.entity';
import { UserPost } from '../user/domain/entities/user-post.entity';
import { PostRepository } from './infrastructure/persistence/typeorm/post.repository';
import { PostCategoryRepository } from './infrastructure/persistence/typeorm/post-category.repository';
import { PostCommentRepository } from './infrastructure/persistence/typeorm/post-comment.repository';
import { PostReactionRepository } from './infrastructure/persistence/typeorm/post-reaction.repository';
import { PostCommentReactionRepository } from './infrastructure/persistence/typeorm/post-comment-reaction.repository';
import { PostViewRepository } from './infrastructure/persistence/typeorm/post-view.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Post,
      PostCategory,
      PostComment,
      PostCommentImage,
      PostReaction,
      PostCommentReaction,
      PostView,
      UserPost,
    ]),
  ],
  exports: [
    TypeOrmModule,
    'IPostRepository',
    'IPostCategoryRepository',
    'IPostCommentRepository',
    'IPostReactionRepository',
    'IPostCommentReactionRepository',
    'IPostViewRepository',
    PostRepository,
    PostCategoryRepository,
    PostCommentRepository,
    PostReactionRepository,
    PostViewRepository,
  ],
  providers: [
    {
      provide: 'IPostRepository',
      useClass: PostRepository,
    },
    {
      provide: 'IPostCategoryRepository',
      useClass: PostCategoryRepository,
    },
    {
      provide: 'IPostCommentRepository',
      useClass: PostCommentRepository,
    },
    {
      provide: 'IPostReactionRepository',
      useClass: PostReactionRepository,
    },
    {
      provide: 'IPostCommentReactionRepository',
      useClass: PostCommentReactionRepository,
    },
    {
      provide: 'IPostViewRepository',
      useClass: PostViewRepository,
    },
    PostRepository,
    PostCategoryRepository,
    PostCommentRepository,
    PostReactionRepository,
    PostCommentReactionRepository,
    PostViewRepository,
  ],
})
export class PostPersistenceModule {}
