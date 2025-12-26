import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../../shared/redis/redis.service';

@Injectable()
export class SiteReviewCacheService {
  private readonly CACHE_HASH_KEY = 'site_review_statistics:site_dates';

  constructor(private readonly redisService: RedisService) {}

  /**
   * Format date to YYYY-MM-DD in timezone +9 (Asia/Seoul)
   */
  private formatDateInKoreaTimezone(date: Date): string {
    const koreaDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const year = koreaDate.getUTCFullYear();
    const month = String(koreaDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(koreaDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get today's date in timezone +9 format (YYYY-MM-DD)
   */
  getTodayDate(): string {
    return this.formatDateInKoreaTimezone(new Date());
  }

  /**
   * Add a date for a siteId to cache hash
   * Date format: YYYY-MM-DD
   */
  async addSiteDate(siteId: string, date: string): Promise<void> {
    const existingDatesStr = await this.redisService.hGet(
      this.CACHE_HASH_KEY,
      siteId,
    );
    let dates: string[] = [];

    if (existingDatesStr) {
      try {
        dates = JSON.parse(existingDatesStr) as string[];
      } catch (error) {
        // If parsing fails, start with empty array
        dates = [];
      }
    }

    // Add date if not already in the array (unique dates)
    if (!dates.includes(date)) {
      dates.push(date);
      await this.redisService.hSet(
        this.CACHE_HASH_KEY,
        siteId,
        JSON.stringify(dates),
      );
    }
  }

  /**
   * Get all siteIds with their dates from cache hash
   * Returns Map<siteId, dates[]>
   */
  async getSiteDatesMap(): Promise<Map<string, string[]>> {
    const hashData = await this.redisService.hGetAll(this.CACHE_HASH_KEY);
    const result = new Map<string, string[]>();

    for (const [siteId, datesStr] of Object.entries(hashData)) {
      try {
        const dates = JSON.parse(datesStr) as string[];
        if (Array.isArray(dates) && dates.length > 0) {
          result.set(siteId, dates);
        }
      } catch (error) {
        // Skip invalid entries
        continue;
      }
    }

    return result;
  }

  /**
   * Remove siteIds and their dates from cache hash after processing
   */
  async removeSiteDates(siteIds: string[]): Promise<void> {
    if (siteIds.length === 0) {
      return;
    }
    await this.redisService.hDel(this.CACHE_HASH_KEY, ...siteIds);
  }

  /**
   * Clear all cached site dates
   */
  async clearAll(): Promise<void> {
    await this.redisService.delete(this.CACHE_HASH_KEY);
  }
}