import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
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
      throw new NotFoundException('Post not found');
    }

    // Validate images
    const maxSize = 20 * 1024 * 1024; // 20MB
    const allowedTypes = /(jpg|jpeg|png|webp)$/i;
    if (command.images) {
      if (command.images.length > 5) {
        throw new BadRequestException('Maximum 5 images per comment');
      }
      for (let i = 0; i < command.images.length; i++) {
        const image = command.images[i];
        if (image.size > maxSize) {
          throw new BadRequestException(`Image ${i + 1} file size exceeds 20MB`);
        }
        if (!allowedTypes.test(image.mimetype)) {
          throw new BadRequestException(
            `Invalid image ${i + 1} file type. Allowed: jpg, jpeg, png, webp`,
          );
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
            relations: ['images', 'user'],
          });

          if (!reloaded) {
            throw new Error('Failed to reload comment after creation');
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
