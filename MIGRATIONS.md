## Database Migrations - Quick Guide

This project uses TypeORM migrations with a Laravel-like CLI wrapper.

- Migration directory: `src/migrations`
- File format: `<timestamp>-<name>.ts` (e.g., `1760784000000-AddTriesToTransactions.ts`)
- Tracking table: `migrations`
- Sync: disabled (migrations are the single source of truth)

Environment variables are read from `.env`: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`.

### 1) Create a migration

```bash
npm run migration create --name AddSomething
```

Fills a template file in `src/migrations`. Implement `up()` and `down()` yourself.

Template example:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSomething1699999999999 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasCol = await queryRunner.hasColumn('your_table', 'new_col');
    if (!hasCol) {
      await queryRunner.query(`
        ALTER TABLE "your_table"
        ADD COLUMN "new_col" varchar(50) DEFAULT 'value'
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasCol = await queryRunner.hasColumn('your_table', 'new_col');
    if (hasCol) {
      await queryRunner.query(`
        ALTER TABLE "your_table"
        DROP COLUMN "new_col"
      `);
    }
  }
}
```

Tips:
- Prefer `ALTER` instead of drop/recreate tables.
- Use `hasColumn/hasIndex` guards for idempotency.
- Avoid destructive operations in production.

### 2) Run all pending migrations

```bash
npm run migration up
```

Runs pending migrations and records them in the `migrations` table.

### 3) Roll back the last migration

```bash
npm run migration down
```

Reverts the most recent executed migration.

### 4) Show migration status

```bash
npm run migration status
```

Prints executed and pending migrations.

### 5) Reset all migrations

```bash
npm run migration reset
```

Reverts migrations one-by-one until none remain executed.

### 6) Fresh database (drop and re-migrate)

```bash
npm run migration fresh
```

Drops the database schema and runs all migrations from scratch.

### 7) Run a specific migration file (advanced)

```bash
npm run migration run --file 1760784000000-AddTriesToTransactions.ts
```

Executes only the `up()` of that file inside a transaction. This does NOT write to the `migrations` tracking table. Prefer `up` for normal workflows.

### 8) Common patterns

- Add a column with default (Postgres >= 11 avoids full table rewrite for constants):
  ```sql
  ALTER TABLE "t" ADD COLUMN "c" integer DEFAULT 0;
  ```

- Backfill safely:
  1) Add nullable column without default
  2) `UPDATE` to fill values in batches
  3) Set default, then `SET NOT NULL`

- Avoid touching other columns (e.g., `created_at`) when only adding a new column.

### 9) Seeder quick reference

- Create seeder:
  ```bash
  npm run seeder create --name YourSeeder
  ```

- Run default seeders:
  ```bash
  npm run seeder run
  ```

- Run a specific seeder file:
  ```bash
  npm run seeder run --file demo-data.seeder.ts
  ```

Run seeders after `npm run migration up`.

### 10) Troubleshooting

- See what columns exist:
  ```sql
  SELECT column_name, column_default
  FROM information_schema.columns
  WHERE table_name = 'transactions';
  ```

- See migration history:
  ```sql
  SELECT * FROM "migrations" ORDER BY "timestamp";
  ```

- Check indexes on a table:
  ```sql
  SELECT indexname FROM pg_indexes WHERE tablename = 'transactions';
  ```


