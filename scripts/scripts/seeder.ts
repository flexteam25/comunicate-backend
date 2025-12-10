import { DataSource } from 'typeorm';
import { User } from '../src/modules/user/domain/entities/user.entity';
import { UserToken } from '../src/modules/auth/domain/entities/user-token.entity';
import { Role } from '../src/modules/user/domain/entities/role.entity';
import { Permission } from '../src/modules/user/domain/entities/permission.entity';
import { Badge } from '../src/modules/badge/domain/entities/badge.entity';
import { UserRole } from '../src/modules/user/domain/entities/user-role.entity';
import { UserPermission } from '../src/modules/user/domain/entities/user-permission.entity';
import { UserBadge } from '../src/modules/user/domain/entities/user-badge.entity';
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
const name = args[1]; // --name YourName
const file = args[1]; // --file YourFile

async function createSeeder() {
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

async function runSeeder() {
  const dataSource = new DataSource({
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
    ],
    synchronize: false,
    logging: true,
  });

  try {
    await dataSource.initialize();
    console.log('📡 Database connected successfully!');
    
    // Run auth user seeder
    console.log('\n🌱 Running Auth User seeder...');
    const { AuthUserSeeder } = await import('../src/seeders/auth-user-seeder');
    const authUserSeeder = new AuthUserSeeder(dataSource);
    await authUserSeeder.seed();
    
    console.log('\n✅ All seeders completed successfully!');
  } catch (error) {
    console.error('❌ Error running seeder:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

async function runSpecificSeeder() {
  if (!file || file === '--file') {
    console.error('❌ Usage: npm run seeder run --file YourSeederFile');
    process.exit(1);
  }

  const dataSource = new DataSource({
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
    ],
    synchronize: false,
    logging: true,
  });

  try {
    await dataSource.initialize();
    console.log('📡 Database connected successfully!');
    
    const seedersDir = path.join(__dirname, '../src/seeders');
    const seederFile = path.join(seedersDir, file);
    
    if (!fs.existsSync(seederFile)) {
      console.error(`❌ Seeder file not found: ${seederFile}`);
      process.exit(1);
    }

    console.log(`🌱 Running seeder: ${file}`);
    
    const seederModule = await import(seederFile);
    const SeederClass = Object.values(seederModule)[0] as any;
    
    if (SeederClass) {
      const seeder = new SeederClass(dataSource);
      await seeder.seed();
      console.log('✅ Seeder completed successfully!');
    } else {
      console.error('❌ Seeder class not found in file');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error running seeder:', error);
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
  if (args[1] === '--file') {
    runSpecificSeeder();
  } else {
    runSeeder();
  }
} else {
  console.log('Usage:');
  console.log('  npm run seeder create --name YourSeederName');
  console.log('  npm run seeder run');
  console.log('  npm run seeder run --file YourSeederFile');
}
