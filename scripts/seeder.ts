import { DataSource } from 'typeorm';
import { User } from '../src/modules/user/domain/entities/user.entity';
import { UserToken } from '../src/modules/auth/domain/entities/user-token.entity';
import { Role } from '../src/modules/user/domain/entities/role.entity';
import { Permission } from '../src/modules/user/domain/entities/permission.entity';
import { Badge } from '../src/modules/badge/domain/entities/badge.entity';
import { UserRole } from '../src/modules/user/domain/entities/user-role.entity';
import { UserPermission } from '../src/modules/user/domain/entities/user-permission.entity';
import { UserBadge } from '../src/modules/user/domain/entities/user-badge.entity';
import { Admin } from '../src/modules/admin/domain/entities/admin.entity';
import { AdminToken } from '../src/modules/admin/domain/entities/admin-token.entity';
import { AdminRole } from '../src/modules/admin/domain/entities/admin-role.entity';
import { AdminPermission } from '../src/modules/admin/domain/entities/admin-permission.entity';
import { AdminOldPassword } from '../src/modules/user/domain/entities/admin-old-password.entity';
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
const action = args[0]; // create, run
const name = args[1] === '--name' ? args[2] : args[1]; // --name YourName or YourName
const file = args[1] === '--file' ? args[2] : args[1]; // --file YourFile or YourFile

interface SeederClass {
  new (dataSource: DataSource): {
    seed: () => Promise<void>;
  };
}

/**
 * Create DataSource configuration
 */
function createDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
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
      Admin,
      AdminToken,
      AdminRole,
      AdminPermission,
      AdminOldPassword,
    ],
    synchronize: false,
    logging: true,
  });
}

/**
 * Normalize seeder file name
 */
function normalizeSeederFileName(fileName: string): string {
  let normalized = fileName;
  // Remove .ts extension
  if (normalized.endsWith('.ts')) {
    normalized = normalized.replace(/\.ts$/, '');
  }
  // Remove src/seeders/ prefix
  if (normalized.startsWith('src/seeders/')) {
    normalized = normalized.replace('src/seeders/', '');
  }
  // Remove ./src/seeders/ prefix
  if (normalized.startsWith('./src/seeders/')) {
    normalized = normalized.replace('./src/seeders/', '');
  }
  return normalized;
}

/**
 * Create a new seeder file
 */
function createSeeder(): void {
  if (!name || name === '--name') {
    console.error('❌ Usage: npm run seeder create --name YourSeederName');
    process.exit(1);
  }

  const className = name.charAt(0).toUpperCase() + name.slice(1).replace(/[-_]/g, '');
  const fileName = `${name.toLowerCase()}.seeder.ts`;

  const seederContent = `import { DataSource } from 'typeorm';

export class ${className} {
  constructor(private dataSource: DataSource) {}

  async seed(): Promise<void> {
    // Check if data already exists
    // const repository = this.dataSource.getRepository(YourEntity);
    // const existingCount = await repository.count();
    // if (existingCount > 0) {
    //   console.log('Data already exists, skipping seed...');
    //   return;
    // }

    console.log('🌱 Starting to seed ${name}...');

    const data = [
      // Add your seed data here
    ];

    try {
      // await repository.save(data);
      console.log('✅ ${name} seeded successfully!');
      console.log(\`📊 Total records: \${data.length}\`);
    } catch (error) {
      console.error('❌ Error seeding ${name}:', error);
      throw error;
    }
  }
}`;

  const seedersDir = path.join(__dirname, '../src/seeders');
  const filePath = path.join(seedersDir, fileName);

  if (!fs.existsSync(seedersDir)) {
    fs.mkdirSync(seedersDir, { recursive: true });
  }

  fs.writeFileSync(filePath, seederContent);
  console.log(`✅ Seeder created: ${fileName}`);
}

/**
 * Run default seeders
 */
async function runSeeder(): Promise<void> {
  const dataSource = createDataSource();

  try {
    await dataSource.initialize();
    console.log('📡 Database connected successfully!');

    // Run auth user seeder
    console.log('\n🌱 Running Auth User seeder...');
    const { AuthUserSeeder } = await import('../src/seeders/auth-user-seeder');
    const { AuthAdminSeeder } = await import('../src/seeders/auth-admin-seeder');

    const authUserSeeder = new AuthUserSeeder(dataSource);
    await authUserSeeder.seed();

    const authAdminSeeder = new AuthAdminSeeder(dataSource);
    await authAdminSeeder.seed();

    console.log('\n✅ All seeders completed successfully!');
  } catch (error) {
    console.error('❌ Error running seeder:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

/**
 * Run a specific seeder file
 */
async function runSpecificSeeder(): Promise<void> {
  if (!file || file === '--file') {
    console.error('❌ Usage: npm run seeder run --file YourSeederFile');
    process.exit(1);
  }

  const dataSource = createDataSource();

  try {
    await dataSource.initialize();
    console.log('📡 Database connected successfully!');

    // Normalize file name
    const seederFileName = normalizeSeederFileName(file);

    // Build import path (relative to scripts/seeder.ts)
    const importPath = `../src/seeders/${seederFileName}`;

    // Verify file exists
    const seedersDir = path.join(__dirname, '../src/seeders');
    const seederFilePath = path.join(seedersDir, `${seederFileName}.ts`);
    if (!fs.existsSync(seederFilePath)) {
      console.error(`❌ Seeder file not found: ${seederFilePath}`);
      process.exit(1);
    }

    console.log(`🌱 Running seeder: ${seederFileName}`);
    console.log(`📂 Import path: ${importPath}`);

    // Import and instantiate seeder
    const seederModule = (await import(importPath)) as Record<string, unknown>;
    const exportedClasses = Object.values(seederModule);
    const SeederClass = exportedClasses.find(
      (exp): exp is SeederClass => typeof exp === 'function',
    );

    if (!SeederClass) {
      console.error(
        '❌ Seeder class not found in file. Available exports:',
        Object.keys(seederModule),
      );
      process.exit(1);
    }

    const seeder = new SeederClass(dataSource);
    if (typeof seeder.seed !== 'function') {
      console.error('❌ Seeder class does not have a seed() method');
      process.exit(1);
    }

    await seeder.seed();
    console.log('✅ Seeder completed successfully!');
  } catch (error) {
    console.error('❌ Error running seeder:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      if (error.stack) {
        console.error('Error stack:', error.stack);
      }
    }
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

// Main logic
if (action === 'create') {
  createSeeder();
} else if (action === 'run') {
  if (args[1] === '--file' || (args[1] && !args[1].startsWith('--'))) {
    // If --file flag is present or a file name is provided directly
    if (!file || file === '--file') {
      console.error('❌ Usage: npm run seeder run --file YourSeederFile');
      process.exit(1);
    }
    void runSpecificSeeder();
  } else {
    void runSeeder();
  }
} else {
  console.log('Usage:');
  console.log('  npm run seeder create --name YourSeederName');
  console.log('  npm run seeder run');
  console.log('  npm run seeder run --file YourSeederFile');
  console.log('  npm run seeder run YourSeederFile (without --file flag)');
}
