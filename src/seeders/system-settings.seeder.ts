import { DataSource } from 'typeorm';
import { SystemSetting } from '../modules/system-settings/domain/entities/system-setting.entity';

const MAINTENANCE_KEY = 'maintenance';
const MAINTENANCE_DEFAULT_VALUE = {
  status: 0,
  allowed_ips: [] as string[],
};

export class SystemSettingsSeeder {
  constructor(private dataSource: DataSource) {}

  async seed(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const repo = queryRunner.manager.getRepository(SystemSetting);
      const existing = await repo.findOne({ where: { key: MAINTENANCE_KEY } });

      if (existing) {
        console.log('Maintenance system setting already exists, skipping.');
        await queryRunner.commitTransaction();
        return;
      }

      await repo.insert({
        key: MAINTENANCE_KEY,
        value: MAINTENANCE_DEFAULT_VALUE,
      });

      await queryRunner.commitTransaction();
      console.log('✅ System settings (maintenance) seeder completed successfully.');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('❌ System settings seeder failed:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
