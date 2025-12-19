import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddTypeToRolesAndPermissions1765514782256 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set timezone to UTC for this session
    await queryRunner.query("SET timezone = 'UTC'");

    // Add type column to roles table
    await queryRunner.addColumn(
      "roles",
      new TableColumn({
        name: "type",
        type: "varchar",
        length: "20",
        isNullable: false,
        default: "'user'",
      }),
    );

    // Add type column to permissions table
    await queryRunner.addColumn(
      "permissions",
      new TableColumn({
        name: "type",
        type: "varchar",
        length: "20",
        isNullable: false,
        default: "'user'",
      }),
    );

    // Update existing roles: set 'admin' role to type 'admin', others to 'user'
    await queryRunner.query(`
      UPDATE roles 
      SET type = 'admin' 
      WHERE name = 'admin'
    `);

    await queryRunner.query(`
      UPDATE roles 
      SET type = 'user' 
      WHERE name != 'admin'
    `);

    // Update existing permissions: set admin-related permissions to type 'admin'
    await queryRunner.query(`
      UPDATE permissions 
      SET type = 'admin' 
      WHERE name LIKE 'admin.%' 
         OR name LIKE 'users.%' 
         OR name LIKE 'sites.%' 
         OR name = 'reviews.moderate' 
         OR name = 'scam-reports.moderate'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove type column from permissions table
    await queryRunner.dropColumn("permissions", "type");

    // Remove type column from roles table
    await queryRunner.dropColumn("roles", "type");
  }
}
