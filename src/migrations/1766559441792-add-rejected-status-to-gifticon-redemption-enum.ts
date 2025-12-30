import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRejectedStatusToGifticonRedemptionEnum1766559441792 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'rejected' value to the enum type
    // Use DO block to handle the case where the value might already exist
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE gifticon_redemption_status_enum ADD VALUE 'rejected';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL does not support removing enum values directly
  }
}
