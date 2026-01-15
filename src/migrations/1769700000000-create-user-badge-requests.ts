import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateUserBadgeRequests1769700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SET timezone = 'UTC'");

    // Create user_badge_requests table
    await queryRunner.createTable(
      new Table({
        name: 'user_badge_requests',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'badge_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'admin_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
          },
          {
            name: 'note',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'user_badge_requests',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'user_badge_requests',
      new TableForeignKey({
        columnNames: ['badge_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'badges',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'user_badge_requests',
      new TableForeignKey({
        columnNames: ['admin_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'admins',
        onDelete: 'SET NULL',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'user_badge_requests',
      new TableIndex({
        name: 'IDX_user_badge_requests_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'user_badge_requests',
      new TableIndex({
        name: 'IDX_user_badge_requests_badge_id',
        columnNames: ['badge_id'],
      }),
    );

    await queryRunner.createIndex(
      'user_badge_requests',
      new TableIndex({
        name: 'IDX_user_badge_requests_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'user_badge_requests',
      new TableIndex({
        name: 'IDX_user_badge_requests_user_badge_status',
        columnNames: ['user_id', 'badge_id', 'status'],
      }),
    );

    // Create user_badge_request_images table
    await queryRunner.createTable(
      new Table({
        name: 'user_badge_request_images',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'request_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'image_url',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'order',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create foreign key for images
    await queryRunner.createForeignKey(
      'user_badge_request_images',
      new TableForeignKey({
        columnNames: ['request_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user_badge_requests',
        onDelete: 'CASCADE',
      }),
    );

    // Create index for images
    await queryRunner.createIndex(
      'user_badge_request_images',
      new TableIndex({
        name: 'IDX_user_badge_request_images_request_id',
        columnNames: ['request_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop user_badge_request_images table
    await queryRunner.dropIndex('user_badge_request_images', 'IDX_user_badge_request_images_request_id');

    const imagesTable = await queryRunner.getTable('user_badge_request_images');
    const imagesForeignKey = imagesTable?.foreignKeys.find((fk) => fk.columnNames.indexOf('request_id') !== -1);
    if (imagesForeignKey) {
      await queryRunner.dropForeignKey('user_badge_request_images', imagesForeignKey);
    }

    await queryRunner.dropTable('user_badge_request_images');

    // Drop user_badge_requests table
    await queryRunner.dropIndex('user_badge_requests', 'IDX_user_badge_requests_user_badge_status');
    await queryRunner.dropIndex('user_badge_requests', 'IDX_user_badge_requests_status');
    await queryRunner.dropIndex('user_badge_requests', 'IDX_user_badge_requests_badge_id');
    await queryRunner.dropIndex('user_badge_requests', 'IDX_user_badge_requests_user_id');

    const requestsTable = await queryRunner.getTable('user_badge_requests');
    if (requestsTable) {
      const foreignKeys = requestsTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('user_badge_requests', foreignKey);
      }
    }

    await queryRunner.dropTable('user_badge_requests');
  }
}
