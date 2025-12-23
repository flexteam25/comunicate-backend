import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveLikeCountFromPostsAndComments1766479300000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // posts table
    const postsTable = await queryRunner.getTable('posts');
    const postsLikeCountColumn = postsTable?.findColumnByName('like_count');
    if (postsLikeCountColumn) {
      await queryRunner.dropColumn('posts', 'like_count');
    }

    // post_comments table
    const postCommentsTable = await queryRunner.getTable('post_comments');
    const postCommentsLikeCountColumn =
      postCommentsTable?.findColumnByName('like_count');
    if (postCommentsLikeCountColumn) {
      await queryRunner.dropColumn('post_comments', 'like_count');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add like_count to posts
    const postsTable = await queryRunner.getTable('posts');
    const postsLikeCountColumn = postsTable?.findColumnByName('like_count');
    if (!postsLikeCountColumn) {
      await queryRunner.addColumn(
        'posts',
        new TableColumn({
          name: 'like_count',
          type: 'integer',
          isNullable: false,
          default: 0,
        }),
      );
    }

    // Re-add like_count to post_comments
    const postCommentsTable = await queryRunner.getTable('post_comments');
    const postCommentsLikeCountColumn =
      postCommentsTable?.findColumnByName('like_count');
    if (!postCommentsLikeCountColumn) {
      await queryRunner.addColumn(
        'post_comments',
        new TableColumn({
          name: 'like_count',
          type: 'integer',
          isNullable: false,
          default: 0,
        }),
      );
    }
  }
}
