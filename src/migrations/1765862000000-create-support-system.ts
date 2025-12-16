import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateSupportSystem1765862000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Create inquiries table
    await queryRunner.createTable(
      new Table({
        name: 'inquiries',
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
            name: 'message',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'images',
            type: 'text',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'admin_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'admin_reply',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'replied_at',
            type: 'timestamptz',
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
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create feedbacks table
    await queryRunner.createTable(
      new Table({
        name: 'feedbacks',
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
            name: 'message',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'images',
            type: 'text',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'is_viewed',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'viewed_by_admin_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'viewed_at',
            type: 'timestamptz',
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
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create bug_reports table
    await queryRunner.createTable(
      new Table({
        name: 'bug_reports',
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
            name: 'message',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'images',
            type: 'text',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'is_viewed',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'viewed_by_admin_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'viewed_at',
            type: 'timestamptz',
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
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create advertising_contacts table
    await queryRunner.createTable(
      new Table({
        name: 'advertising_contacts',
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
            name: 'message',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'images',
            type: 'text',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'is_viewed',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'viewed_by_admin_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'viewed_at',
            type: 'timestamptz',
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
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create foreign keys for inquiries
    await queryRunner.createForeignKey(
      'inquiries',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'inquiries',
      new TableForeignKey({
        columnNames: ['admin_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'admins',
        onDelete: 'SET NULL',
      }),
    );

    // Create foreign keys for feedbacks
    await queryRunner.createForeignKey(
      'feedbacks',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'feedbacks',
      new TableForeignKey({
        columnNames: ['viewed_by_admin_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'admins',
        onDelete: 'SET NULL',
      }),
    );

    // Create foreign keys for bug_reports
    await queryRunner.createForeignKey(
      'bug_reports',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'bug_reports',
      new TableForeignKey({
        columnNames: ['viewed_by_admin_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'admins',
        onDelete: 'SET NULL',
      }),
    );

    // Create foreign keys for advertising_contacts
    await queryRunner.createForeignKey(
      'advertising_contacts',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'advertising_contacts',
      new TableForeignKey({
        columnNames: ['viewed_by_admin_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'admins',
        onDelete: 'SET NULL',
      }),
    );

    // Create indexes for inquiries
    await queryRunner.createIndex(
      'inquiries',
      new TableIndex({
        name: 'IDX_inquiries_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'inquiries',
      new TableIndex({
        name: 'IDX_inquiries_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'inquiries',
      new TableIndex({
        name: 'IDX_inquiries_admin_id',
        columnNames: ['admin_id'],
      }),
    );

    // Create indexes for feedbacks
    await queryRunner.createIndex(
      'feedbacks',
      new TableIndex({
        name: 'IDX_feedbacks_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'feedbacks',
      new TableIndex({
        name: 'IDX_feedbacks_is_viewed',
        columnNames: ['is_viewed'],
      }),
    );

    // Create indexes for bug_reports
    await queryRunner.createIndex(
      'bug_reports',
      new TableIndex({
        name: 'IDX_bug_reports_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'bug_reports',
      new TableIndex({
        name: 'IDX_bug_reports_is_viewed',
        columnNames: ['is_viewed'],
      }),
    );

    // Create indexes for advertising_contacts
    await queryRunner.createIndex(
      'advertising_contacts',
      new TableIndex({
        name: 'IDX_advertising_contacts_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'advertising_contacts',
      new TableIndex({
        name: 'IDX_advertising_contacts_is_viewed',
        columnNames: ['is_viewed'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('advertising_contacts', 'IDX_advertising_contacts_is_viewed');
    await queryRunner.dropIndex('advertising_contacts', 'IDX_advertising_contacts_user_id');
    await queryRunner.dropIndex('bug_reports', 'IDX_bug_reports_is_viewed');
    await queryRunner.dropIndex('bug_reports', 'IDX_bug_reports_user_id');
    await queryRunner.dropIndex('feedbacks', 'IDX_feedbacks_is_viewed');
    await queryRunner.dropIndex('feedbacks', 'IDX_feedbacks_user_id');
    await queryRunner.dropIndex('inquiries', 'IDX_inquiries_admin_id');
    await queryRunner.dropIndex('inquiries', 'IDX_inquiries_status');
    await queryRunner.dropIndex('inquiries', 'IDX_inquiries_user_id');

    // Drop foreign keys
    const advertisingContactsTable = await queryRunner.getTable('advertising_contacts');
    if (advertisingContactsTable) {
      const fkViewedBy = advertisingContactsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('viewed_by_admin_id') !== -1,
      );
      if (fkViewedBy) {
        await queryRunner.dropForeignKey('advertising_contacts', fkViewedBy);
      }
      const fkUser = advertisingContactsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('user_id') !== -1,
      );
      if (fkUser) {
        await queryRunner.dropForeignKey('advertising_contacts', fkUser);
      }
    }

    const bugReportsTable = await queryRunner.getTable('bug_reports');
    if (bugReportsTable) {
      const fkViewedBy = bugReportsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('viewed_by_admin_id') !== -1,
      );
      if (fkViewedBy) {
        await queryRunner.dropForeignKey('bug_reports', fkViewedBy);
      }
      const fkUser = bugReportsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('user_id') !== -1,
      );
      if (fkUser) {
        await queryRunner.dropForeignKey('bug_reports', fkUser);
      }
    }

    const feedbacksTable = await queryRunner.getTable('feedbacks');
    if (feedbacksTable) {
      const fkViewedBy = feedbacksTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('viewed_by_admin_id') !== -1,
      );
      if (fkViewedBy) {
        await queryRunner.dropForeignKey('feedbacks', fkViewedBy);
      }
      const fkUser = feedbacksTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('user_id') !== -1,
      );
      if (fkUser) {
        await queryRunner.dropForeignKey('feedbacks', fkUser);
      }
    }

    const inquiriesTable = await queryRunner.getTable('inquiries');
    if (inquiriesTable) {
      const fkAdmin = inquiriesTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('admin_id') !== -1,
      );
      if (fkAdmin) {
        await queryRunner.dropForeignKey('inquiries', fkAdmin);
      }
      const fkUser = inquiriesTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('user_id') !== -1,
      );
      if (fkUser) {
        await queryRunner.dropForeignKey('inquiries', fkUser);
      }
    }

    // Drop tables
    await queryRunner.dropTable('advertising_contacts');
    await queryRunner.dropTable('bug_reports');
    await queryRunner.dropTable('feedbacks');
    await queryRunner.dropTable('inquiries');
  }
}

