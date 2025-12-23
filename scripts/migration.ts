import { DataSource } from 'typeorm';
import { User } from '../src/modules/user/domain/entities/user.entity';
import { UserToken } from '../src/modules/auth/domain/entities/user-token.entity';
import { Role } from '../src/modules/user/domain/entities/role.entity';
import { Permission } from '../src/modules/user/domain/entities/permission.entity';
import { Badge } from '../src/modules/badge/domain/entities/badge.entity';
import { UserRole } from '../src/modules/user/domain/entities/user-role.entity';
import { UserPermission } from '../src/modules/user/domain/entities/user-permission.entity';
import { UserBadge } from '../src/modules/user/domain/entities/user-badge.entity';
import { UserProfile } from '../src/modules/user/domain/entities/user-profile.entity';
import { UserFavoriteSite } from '../src/modules/user/domain/entities/user-favorite-site.entity';
import { Site } from '../src/modules/site/domain/entities/site.entity';
import { SiteCategory } from '../src/modules/site/domain/entities/site-category.entity';
import { SiteBadge } from '../src/modules/site/domain/entities/site-badge.entity';
import { SiteDomain } from '../src/modules/site/domain/entities/site-domain.entity';
import { SiteView } from '../src/modules/site/domain/entities/site-view.entity';
import { Tier } from '../src/modules/tier/domain/entities/tier.entity';
import { UserHistorySite } from '../src/modules/user/domain/entities/user-history-site.entity';
import { UserComment } from '../src/modules/user/domain/entities/user-comment.entity';
import { Admin } from '../src/modules/admin/domain/entities/admin.entity';
import { AdminToken } from '../src/modules/admin/domain/entities/admin-token.entity';
import { AdminRole } from '../src/modules/admin/domain/entities/admin-role.entity';
import { AdminPermission } from '../src/modules/admin/domain/entities/admin-permission.entity';
import { AdminOldPassword } from '../src/modules/user/domain/entities/admin-old-password.entity';
import { Inquiry } from '../src/modules/support/domain/entities/inquiry.entity';
import { Attendance } from '../src/modules/attendance/domain/entities/attendance.entity';
import { AttendanceStatistic } from '../src/modules/attendance/domain/entities/attendance-statistic.entity';
import { ScamReport } from '../src/modules/scam-report/domain/entities/scam-report.entity';
import { ScamReportImage } from '../src/modules/scam-report/domain/entities/scam-report-image.entity';
import { ScamReportComment } from '../src/modules/scam-report/domain/entities/scam-report-comment.entity';
import { ScamReportCommentImage } from '../src/modules/scam-report/domain/entities/scam-report-comment-image.entity';
import { ScamReportReaction } from '../src/modules/scam-report/domain/entities/scam-report-reaction.entity';
import { SiteReview } from '../src/modules/site-review/domain/entities/site-review.entity';
import { SiteReviewReaction } from '../src/modules/site-review/domain/entities/site-review-reaction.entity';
import { SiteReviewComment } from '../src/modules/site-review/domain/entities/site-review-comment.entity';
import { SiteManager } from '../src/modules/site-manager/domain/entities/site-manager.entity';
import { SiteManagerApplication } from '../src/modules/site-manager/domain/entities/site-manager-application.entity';
import { PocaEvent } from '../src/modules/poca-event/domain/entities/poca-event.entity';
import { PocaEventBanner } from '../src/modules/poca-event/domain/entities/poca-event-banner.entity';
import { PocaEventView } from '../src/modules/poca-event/domain/entities/poca-event-view.entity';
import { Gifticon } from '../src/modules/gifticon/domain/entities/gifticon.entity';
import { Post } from '../src/modules/post/domain/entities/post.entity';
import { PostCategory } from '../src/modules/post/domain/entities/post-category.entity';
import { PostComment } from '../src/modules/post/domain/entities/post-comment.entity';
import { PostCommentImage } from '../src/modules/post/domain/entities/post-comment-image.entity';
import { PostReaction } from '../src/modules/post/domain/entities/post-reaction.entity';
import { PostView } from '../src/modules/post/domain/entities/post-view.entity';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Debug environment variables
console.log('🔧 Environment variables:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USERNAME:', process.env.DB_USERNAME);
console.log('DB_DATABASE:', process.env.DB_DATABASE);

const args = process.argv.slice(2);
const action = args[0]; // create, up, down, status, reset, fresh, run
const name = args[1]; // --name YourName
const file = args[1]; // --file YourFile

async function createMigration() {
  if (!name || name === '--name') {
    console.error('❌ Usage: npm run migration create --name YourMigrationName');
    process.exit(1);
  }

  const timestamp = Date.now();
  const className = name.charAt(0).toUpperCase() + name.slice(1).replace(/[-_]/g, '');
  const fileName = `${timestamp}-${name}.ts`;

  const migrationContent = `import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class ${className}${timestamp} implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add your migration logic here
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add your rollback logic here
  }
}`;

  const migrationsDir = path.join(__dirname, '../src/migrations');
  const filePath = path.join(migrationsDir, fileName);

  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  fs.writeFileSync(filePath, migrationContent);
  console.log(`✅ Migration created: ${fileName}`);
}

function buildDataSource() {
  return new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'poca_db',
    entities: [
      User,
      UserToken,
      Role,
      Permission,
      Badge,
      UserRole,
      UserPermission,
      UserBadge,
      UserProfile,
      UserFavoriteSite,
      Site,
      SiteCategory,
      SiteBadge,
      SiteDomain,
      SiteView,
      Tier,
      UserHistorySite,
      UserComment,
      Admin,
      AdminToken,
      AdminRole,
      AdminPermission,
      AdminOldPassword,
      UserProfile,
      Inquiry,
      Attendance,
      AttendanceStatistic,
      ScamReport,
      ScamReportImage,
      ScamReportComment,
      ScamReportCommentImage,
      ScamReportReaction,
      SiteReview,
      SiteReviewReaction,
      SiteReviewComment,
      SiteManager,
      SiteManagerApplication,
      PocaEvent,
      PocaEventBanner,
      PocaEventView,
      Gifticon,
    ],
    migrations: [path.join(__dirname, '../src/migrations/*.{ts,js}')],
    migrationsTableName: 'migrations',
    synchronize: false,
    logging: true,
  });
}

async function migrationUp() {
  const dataSource = buildDataSource();
  try {
    await dataSource.initialize();
    console.log('📡 Database connected successfully!');
    console.log('🏗️ Running pending migrations...');
    const results = await dataSource.runMigrations();
    results.forEach(m => console.log(`✅ Ran: ${m.name}`));
    if (results.length === 0) console.log('✔️ No pending migrations');
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

async function migrationDown() {
  const dataSource = buildDataSource();
  try {
    await dataSource.initialize();
    console.log('📡 Database connected successfully!');
    console.log('↩️ Reverting last migration...');
    
    // Check if there are any executed migrations
    const executedMigrations = await dataSource.query('SELECT * FROM "migrations" ORDER BY "timestamp" DESC LIMIT 1');
    if (executedMigrations.length === 0) {
      console.log('✔️ No executed migrations to revert');
      return;
    }
    
    await dataSource.undoLastMigration();
    console.log(`✅ Reverted: ${executedMigrations[0].name}`);
  } catch (error) {
    console.error('❌ Error reverting migration:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

async function migrationStatus() {
  const dataSource = buildDataSource();
  try {
    await dataSource.initialize();
    console.log('📡 Database connected successfully!');

    const migrationsDir = path.join(__dirname, '../src/migrations');
    const allFiles = fs
      .readdirSync(migrationsDir)
      .filter(f => f.endsWith('.ts') || f.endsWith('.js'))
      .sort();

    // Executed migrations from migrations table
    let executed: Array<{ id?: number; timestamp?: string; name: string }>; 
    try {
      executed = await dataSource.query('SELECT * FROM "migrations" ORDER BY "timestamp"');
    } catch {
      executed = [];
    }
    const executedNames = new Set(executed.map(m => m.name));

    console.log('\n=== Migration Status ===');
    console.log(`Executed: ${executedNames.size}`);
    executed.forEach(m => console.log(`  [x] ${m.name}`));
    const pending = allFiles.filter(f => !executedNames.has(stripExt(f)));
    console.log(`Pending: ${pending.length}`);
    pending.forEach(f => console.log(`  [ ] ${stripExt(f)}`));
    console.log('========================\n');
  } catch (error) {
    console.error('❌ Error showing status:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

function stripExt(fileName: string): string {
  return fileName.replace(/\.(ts|js)$/i, '');
}

async function migrationReset() {
  const dataSource = buildDataSource();
  try {
    await dataSource.initialize();
    console.log('📡 Database connected successfully!');

    // Keep reverting until none left
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const executedMigrations = await dataSource.query('SELECT * FROM "migrations" ORDER BY "timestamp" DESC LIMIT 1');
      if (executedMigrations.length === 0) break;
      
      await dataSource.undoLastMigration();
      console.log(`↩️ Reverted: ${executedMigrations[0].name}`);
    }
    console.log('✅ All migrations reverted');
  } catch (error) {
    console.error('❌ Error resetting migrations:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

async function migrationFresh() {
  const dataSource = buildDataSource();
  try {
    await dataSource.initialize();
    console.log('📡 Database connected successfully!');
    console.log('🧨 Dropping database schema...');
    await dataSource.dropDatabase();
    console.log('🏗️ Running all migrations...');
    const results = await dataSource.runMigrations();
    results.forEach(m => console.log(`✅ Ran: ${m.name}`));
    console.log('🎉 Fresh database ready');
  } catch (error) {
    console.error('❌ Error running fresh migrations:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

async function runSpecificMigration() {
  if (!file || file === '--file') {
    console.error('❌ Usage: npm run migration run --file YourMigrationFile');
    process.exit(1);
  }

  const dataSource = buildDataSource();

  try {
    await dataSource.initialize();
    console.log('📡 Database connected successfully!');
    
    const migrationsDir = path.join(__dirname, '../src/migrations');
    const migrationFile = path.join(migrationsDir, file);
    
    if (!fs.existsSync(migrationFile)) {
      console.error(`❌ Migration file not found: ${migrationFile}`);
      process.exit(1);
    }

    // Extract migration name from filename
    const migrationName = stripExt(file);
    const [timestamp, name] = migrationName.split('-');
    
    // Check if migration already executed
    const executedMigrations = await dataSource.query('SELECT * FROM "migrations" WHERE "name" = $1', [[name, timestamp].join('')]);
    if (executedMigrations.length > 0) {
      console.log(`⚠️ Migration ${migrationName} already executed. Skipping...`);
      return;
    }

    console.log(`🏗️ Running migration: ${file}`);
    
    const migrationModule = await import(migrationFile);
    const MigrationClass = Object.values(migrationModule)[0] as any;
    
    if (MigrationClass) {
      const migration = new MigrationClass();
      const queryRunner = dataSource.createQueryRunner();
      try {
        await queryRunner.connect();
        await queryRunner.startTransaction();
        await migration.up(queryRunner);
        
        // Record migration in migrations table
        await queryRunner.query(
          'INSERT INTO "migrations" ("timestamp", "name") VALUES ($1, $2)',
          [timestamp, [name, timestamp].join('')]
        );
        
        await queryRunner.commitTransaction();
        console.log('✅ Migration completed and recorded successfully!');
      } catch (error) {
        try { await queryRunner.rollbackTransaction(); } catch {}
        console.error('❌ Error running migration:', error);
        throw error;
      } finally {
        await queryRunner.release();
      }
    } else {
      console.error('❌ Migration class not found in file');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

// Main logic (Laravel-like)
// Commands:
//  - create --name FooBar
//  - up (run pending)
//  - down (revert last)
//  - status
//  - reset (revert all)
//  - fresh (drop DB, run all)
//  - run --file 1760000000000-YourMigration.ts (execute specific file's up and record in migrations table)
if (action === 'create') {
  createMigration();
} else if (action === 'up') {
  migrationUp();
} else if (action === 'down') {
  migrationDown();
} else if (action === 'status') {
  migrationStatus();
} else if (action === 'reset') {
  migrationReset();
} else if (action === 'fresh') {
  migrationFresh();
} else if (action === 'run') {
  if (file && file !== '--file') {
    runSpecificMigration();
  } else {
    console.log('❌ Usage: npm run migration run --file YourMigrationFile');
    process.exit(1);
  }
} else {
  console.log('Usage:');
  console.log('  npm run migration create --name YourMigrationName');
  console.log('  npm run migration up');
  console.log('  npm run migration down');
  console.log('  npm run migration status');
  console.log('  npm run migration reset');
  console.log('  npm run migration fresh');
  console.log('  npm run migration run --file YourMigrationFile');
}
