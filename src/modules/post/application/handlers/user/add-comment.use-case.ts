import { Injectable, Inject } from '@nestjs/common';
import { PostComment } from '../../../domain/entities/post-comment.entity';
import { PostCommentImage } from '../../../domain/entities/post-comment-image.entity';
import { IPostRepository } from '../../../infrastructure/persistence/repositories/post.repository';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { UploadService, MulterFile } from '../../../../../shared/services/upload';
import {
  CommentHasChildService,
  CommentType,
} from '../../../../../shared/services/comment-has-child.service';
import { EntityManager } from 'typeorm';
import {
  UserComment,
  CommentType as UserCommentType,
} from '../../../../user/domain/entities/user-comment.entity';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface AddCommentCommand {
  postId: string;
  userId: string;
  content: string;
  parentCommentId?: string;
  images?: MulterFile[];
}

@Injectable()
export class AddCommentUseCase {
  constructor(
    @Inject('IPostRepository')
    private readonly postRepository: IPostRepository,
    private readonly transactionService: TransactionService,
    private readonly uploadService: UploadService,
    private readonly commentHasChildService: CommentHasChildService,
  ) {}

  async execute(command: AddCommentCommand): Promise<PostComment> {
    const post = await this.postRepository.findById(command.postId);
    if (!post || !post.isPublished) {
      throw notFound(MessageKeys.POST_NOT_FOUND);
    }

    // Validate images
    const maxSize = 20 * 1024 * 1024; // 20MB
    const allowedTypes = /(jpg|jpeg|png|webp)$/i;
    if (command.images) {
      if (command.images.length > 5) {
        throw badRequest(MessageKeys.MAX_IMAGES_PER_COMMENT_EXCEEDED, {
          maxImages: 5,
        });
      }
      for (let i = 0; i < command.images.length; i++) {
        const image = command.images[i];
        if (image.size > maxSize) {
          throw badRequest(MessageKeys.FILE_SIZE_EXCEEDS_LIMIT, {
            fileType: `image ${i + 1}`,
            maxSize: '20MB',
          });
        }
        if (!allowedTypes.test(image.mimetype)) {
          throw badRequest(MessageKeys.INVALID_FILE_TYPE, {
            allowedTypes: 'jpg, jpeg, png, webp',
          });
        }
      }
    }

    // Upload images before transaction
    const uploadedImageUrls: string[] = [];
    if (command.images && command.images.length > 0) {
      for (const image of command.images) {
        const uploadResult = await this.uploadService.uploadImage(image, {
          folder: 'post-comments',
        });
        uploadedImageUrls.push(uploadResult.relativePath);
      }
    }

    // Create comment within transaction
    try {
      const result = await this.transactionService.executeInTransaction(
        async (manager: EntityManager) => {
          const commentRepo = manager.getRepository(PostComment);
          const imageRepo = manager.getRepository(PostCommentImage);
          const userCommentRepo = manager.getRepository(UserComment);

          const comment = commentRepo.create({
            postId: command.postId,
            userId: command.userId,
            parentCommentId: command.parentCommentId,
            content: command.content,
          });

          const savedComment = await commentRepo.save(comment);

          // Save to user_comments for statistics
          const userComment = userCommentRepo.create({
            userId: command.userId,
            commentType: UserCommentType.POST_COMMENT,
            commentId: savedComment.id,
          });
          await userCommentRepo.save(userComment);

          // Create images if provided
          if (uploadedImageUrls.length > 0) {
            const imageEntities = uploadedImageUrls.map((imageUrl, index) =>
              imageRepo.create({
                commentId: savedComment.id,
                imageUrl,
                order: index,
              }),
            );
            await imageRepo.save(imageEntities);
          }

          // Reload with images and user
          const reloaded = await commentRepo.findOne({
            where: { id: savedComment.id },
            relations: ['images', 'user', 'user.userBadges', 'user.userBadges.badge'],
          });

          if (!reloaded) {
            throw notFound(MessageKeys.POST_COMMENT_NOT_FOUND_AFTER_CREATE);
          }

          return reloaded;
        },
      );

      // Update has_child for parent comment asynchronously
      if (result.parentCommentId) {
        void this.commentHasChildService.updateHasChildAsync(
          CommentType.POST,
          result.parentCommentId,
        );
      }

      return result;
    } catch (transactionError) {
      // Cleanup uploaded files if transaction fails
      const cleanupPromises = uploadedImageUrls.map((url) =>
        this.uploadService.deleteFile(url),
      );
      await Promise.allSettled(cleanupPromises);
      throw transactionError;
    }
  }
}
