import { MigrationInterface, QueryRunner, Table, TableIndex, TableUnique } from 'typeorm';

export class CreatePostCommentReactions1768100000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'post_comment_reactions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'comment_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'reaction_type',
            type: 'varchar',
            length: '10',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['comment_id'],
            referencedTableName: 'post_comments',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Create unique constraint
    await queryRunner.createUniqueConstraint(
      'post_comment_reactions',
      new TableUnique({
        name: 'unique_comment_user_reaction',
        columnNames: ['comment_id', 'user_id'],
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'post_comment_reactions',
      new TableIndex({
        name: 'IDX_post_comment_reactions_comment_id',
        columnNames: ['comment_id'],
      }),
    );

    await queryRunner.createIndex(
      'post_comment_reactions',
      new TableIndex({
        name: 'IDX_post_comment_reactions_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'post_comment_reactions',
      new TableIndex({
        name: 'IDX_post_comment_reactions_type',
        columnNames: ['reaction_type'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('post_comment_reactions');
  }
}
