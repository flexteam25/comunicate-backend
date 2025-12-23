import { MigrationInterface, QueryRunner, TableForeignKey, TableColumn } from 'typeorm';

export class DropPostUserFk1766479250958 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Get the posts table
    const postsTable = await queryRunner.getTable('posts');
    if (!postsTable) {
      throw new Error('posts table does not exist');
    }

    // Find and drop existing foreign key for user_id
    const userFk = postsTable.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('user_id') !== -1,
    );

    if (userFk) {
      await queryRunner.dropForeignKey('posts', userFk);
    }

    // Make user_id nullable
    const userIdColumn = postsTable.findColumnByName('user_id');
    if (userIdColumn && !userIdColumn.isNullable) {
      await queryRunner.changeColumn(
        'posts',
        'user_id',
        new TableColumn({
          name: 'user_id',
          type: 'uuid',
          isNullable: true,
        }),
      );
    }

    // Drop created_by_admin column if it exists
    const createdByAdminColumn = postsTable.findColumnByName('created_by_admin');
    if (createdByAdminColumn) {
      await queryRunner.dropColumn('posts', 'created_by_admin');
    }

    // Add admin_id column (nullable)
    const adminIdColumn = postsTable.findColumnByName('admin_id');
    if (!adminIdColumn) {
      await queryRunner.addColumn(
        'posts',
        new TableColumn({
          name: 'admin_id',
          type: 'uuid',
          isNullable: true,
        }),
      );
    }

    // Recreate foreign key for user_id (now nullable, SET NULL on delete)
    await queryRunner.createForeignKey(
      'posts',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    // Create foreign key for admin_id
    await queryRunner.createForeignKey(
      'posts',
      new TableForeignKey({
        columnNames: ['admin_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'admins',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Get the posts table
    const postsTable = await queryRunner.getTable('posts');
    if (!postsTable) {
      throw new Error('posts table does not exist');
    }

    // Drop admin_id foreign key
    const adminFk = postsTable.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('admin_id') !== -1,
    );
    if (adminFk) {
      await queryRunner.dropForeignKey('posts', adminFk);
    }

    // Drop user_id foreign key
    const userFk = postsTable.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('user_id') !== -1,
    );
    if (userFk) {
      await queryRunner.dropForeignKey('posts', userFk);
    }

    // Drop admin_id column
    const adminIdColumn = postsTable.findColumnByName('admin_id');
    if (adminIdColumn) {
      await queryRunner.dropColumn('posts', 'admin_id');
    }

    // Make user_id NOT NULL again
    const userIdColumn = postsTable.findColumnByName('user_id');
    if (userIdColumn && userIdColumn.isNullable) {
      await queryRunner.changeColumn(
        'posts',
        'user_id',
        new TableColumn({
          name: 'user_id',
          type: 'uuid',
          isNullable: false,
        }),
      );
    }

    // Recreate foreign key for user_id (NOT NULL, CASCADE on delete)
    await queryRunner.createForeignKey(
      'posts',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Recreate created_by_admin column
    const createdByAdminColumn = postsTable.findColumnByName('created_by_admin');
    if (!createdByAdminColumn) {
      await queryRunner.addColumn(
        'posts',
        new TableColumn({
          name: 'created_by_admin',
          type: 'boolean',
          default: false,
          isNullable: false,
        }),
      );
    }
  }
}
