import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

/**
 * Transaction Service
 * Provides database transaction management for use cases
 */
@Injectable()
export class TransactionService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Execute a function within a database transaction
   * Uses DataSource.transaction() which automatically handles commit/rollback
   * @param callback Function to execute within transaction (receives EntityManager)
   * @returns Result of the callback function
   */
  async executeInTransaction<T>(
    callback: (entityManager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(async (entityManager: EntityManager) => {
      return callback(entityManager);
    });
  }
}
