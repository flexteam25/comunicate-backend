import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddSlugToSites1767800000000 implements MigrationInterface {
  /**
   * Generate a slug from a name (lowercase, replace spaces with hyphens, remove special chars)
   * Only allows lowercase letters, numbers, and hyphens (matches @IsSlug validator)
   */
  private generateSlug(name: string): string {
    if (!name || name.trim().length === 0) {
      return 'site';
    }

    let slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters (keep only lowercase letters, numbers, spaces, hyphens)
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    // If slug is empty after processing, use fallback
    if (slug.length === 0) {
      slug = 'site';
    }

    // Limit to 50 characters
    return slug.substring(0, 50);
  }

  /**
   * Make slug unique by appending a number if needed (for active sites only)
   */
  private async makeSlugUnique(
    queryRunner: QueryRunner,
    baseSlug: string,
    excludeId?: string,
  ): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      let query = 'SELECT id FROM sites WHERE slug = $1 AND deleted_at IS NULL';
      const params: string[] = [slug];

      if (excludeId) {
        query += ' AND id != $2';
        params.push(excludeId);
      }

      const existing = (await queryRunner.query(query, params)) as Array<{ id: string }>;

      if (existing.length === 0) {
        return slug;
      }

      // Append counter to make it unique
      const suffix = `-${counter}`;
      slug = (baseSlug.substring(0, 50 - suffix.length) + suffix).replace(/-$/, '');
      counter++;
    }
  }

  /**
   * Make slug unique for deleted sites (check all sites including deleted ones)
   */
  private async makeSlugUniqueForDeleted(
    queryRunner: QueryRunner,
    baseSlug: string,
    excludeId?: string,
  ): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      let query = 'SELECT id FROM sites WHERE slug = $1';
      const params: string[] = [slug];

      if (excludeId) {
        query += ' AND id != $2';
        params.push(excludeId);
      }

      const existing = (await queryRunner.query(query, params)) as Array<{ id: string }>;

      if (existing.length === 0) {
        return slug;
      }

      // Append counter to make it unique
      const suffix = `-${counter}`;
      slug = (baseSlug.substring(0, 50 - suffix.length) + suffix).replace(/-$/, '');
      counter++;
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add slug column as nullable first
    await queryRunner.addColumn(
      'sites',
      new TableColumn({
        name: 'slug',
        type: 'varchar',
        length: '50',
        isNullable: true,
      }),
    );

    // Step 2: Generate slugs for existing sites (only non-deleted sites)
    const sites = (await queryRunner.query(
      `SELECT id, name FROM sites WHERE deleted_at IS NULL ORDER BY created_at`,
    )) as Array<{ id: string; name: string | null }>;

    for (const site of sites) {
      const baseSlug = this.generateSlug(site.name || 'site');
      // Pass site.id to exclude it when checking for uniqueness
      const uniqueSlug = await this.makeSlugUnique(queryRunner, baseSlug, site.id);

      await queryRunner.query(`UPDATE sites SET slug = $1 WHERE id = $2`, [
        uniqueSlug,
        site.id,
      ]);
    }

    // Step 2b: Also set slug for deleted sites (to avoid null values)
    const deletedSites = (await queryRunner.query(
      `SELECT id, name FROM sites WHERE deleted_at IS NOT NULL AND slug IS NULL`,
    )) as Array<{ id: string; name: string | null }>;

    for (const site of deletedSites) {
      const baseSlug = this.generateSlug(site.name || 'site');
      // For deleted sites, add prefix and ensure uniqueness
      // Use the same uniqueness check but include deleted sites
      const deletedBaseSlug = `deleted-${baseSlug}`.substring(0, 44); // Reserve space for suffix
      const uniqueSlug = await this.makeSlugUniqueForDeleted(
        queryRunner,
        deletedBaseSlug,
        site.id,
      );

      await queryRunner.query(`UPDATE sites SET slug = $1 WHERE id = $2`, [
        uniqueSlug,
        site.id,
      ]);
    }

    // Step 3: Verify no null values remain before making NOT NULL
    const nullCount = (await queryRunner.query(
      `SELECT COUNT(*) as count FROM sites WHERE slug IS NULL`,
    )) as Array<{ count: string }>;

    if (parseInt(nullCount[0]?.count || '0', 10) > 0) {
      throw new Error(
        `Cannot proceed: ${nullCount[0].count} sites still have null slug values`,
      );
    }

    // Step 4: Make slug NOT NULL
    await queryRunner.query(`ALTER TABLE sites ALTER COLUMN slug SET NOT NULL`);

    // Step 5: Create unique index on slug (only for non-deleted sites)
    // Note: Since deleted sites have unique slugs too, the index will work
    await queryRunner.createIndex(
      'sites',
      new TableIndex({
        name: 'UQ_sites_slug',
        columnNames: ['slug'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop unique index
    await queryRunner.dropIndex('sites', 'UQ_sites_slug');

    // Drop column
    await queryRunner.dropColumn('sites', 'slug');
  }
}
