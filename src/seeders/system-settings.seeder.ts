import { DataSource } from 'typeorm';
import { SystemSetting } from '../modules/system-settings/domain/entities/system-setting.entity';

const MAINTENANCE_KEY = 'maintenance';
const MAINTENANCE_DEFAULT_VALUE = {
  status: 0,
  allowed_ips: [] as string[],
};

const GAME_BET_LIMITS_KEY = 'game_bet_limits';
const GAME_BET_LIMITS_INIT_VALUE = {
  crash: { minBet: 1, maxBet: 1000, maxPayoutAmount: 0 },
  dice: { minBet: 1, maxBet: 1000, maxPayoutAmount: 34200 },
  mines: { minBet: 1, maxBet: 1000, maxPayoutAmount: 297000 },
  plinko: { minBet: 1, maxBet: 1000, maxPayoutAmount: 1000000 },
  scissors: { minBet: 0.005, maxBet: 1000, maxPayoutAmount: 1980 },
  slot: { minBet: 1, maxBet: 1000, maxPayoutAmount: 250000 },
  turtle: { minBet: 1, maxBet: 1000, maxPayoutAmount: 2940 },
};

export class SystemSettingsSeeder {
  constructor(private dataSource: DataSource) {}

  async seed(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const repo = queryRunner.manager.getRepository(SystemSetting);

      const existingMaintenance = await repo.findOne({ where: { key: MAINTENANCE_KEY } });
      if (!existingMaintenance) {
        await repo.insert({
          key: MAINTENANCE_KEY,
          value: MAINTENANCE_DEFAULT_VALUE,
        });
        console.log('  - maintenance: inserted');
      } else {
        console.log('  - maintenance: already exists, skipping');
      }

      const existingGameBetLimits = await repo.findOne({
        where: { key: GAME_BET_LIMITS_KEY },
      });
      if (!existingGameBetLimits) {
        await repo.insert({
          key: GAME_BET_LIMITS_KEY,
          value: GAME_BET_LIMITS_INIT_VALUE,
        });
        console.log('  - game_bet_limits: inserted');
      } else {
        console.log('  - game_bet_limits: already exists, skipping');
      }

      await queryRunner.commitTransaction();
      console.log('✅ System settings seeder completed successfully.');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('❌ System settings seeder failed:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
