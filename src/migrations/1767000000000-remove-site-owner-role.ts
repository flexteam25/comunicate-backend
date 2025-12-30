import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveSiteOwnerRole1767000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SET timezone = 'UTC'");

    // Find site-owner role ID
    const siteOwnerRole = await queryRunner.query(
      `SELECT id FROM roles WHERE name = 'site-owner' AND deleted_at IS NULL LIMIT 1`,
    );

    if (siteOwnerRole && siteOwnerRole.length > 0) {
      const siteOwnerRoleId = siteOwnerRole[0].id;

      // Delete all UserRole records with site-owner role
      await queryRunner.query(
        `DELETE FROM user_roles WHERE role_id = $1`,
        [siteOwnerRoleId],
      );

      // Soft delete the site-owner role
      await queryRunner.query(
        `UPDATE roles SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [siteOwnerRoleId],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SET timezone = 'UTC'");

    // Restore site-owner role (soft delete reversal)
    await queryRunner.query(
      `UPDATE roles SET deleted_at = NULL WHERE name = 'site-owner'`,
    );

    // Note: UserRole records cannot be restored as we don't track which users had site-owner role
  }
}

