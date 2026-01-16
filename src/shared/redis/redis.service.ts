import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import { LoggerService } from '../logger/logger.service';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private subscriber: RedisClientType | null = null;
  private subscriptions: Map<string, Set<(data: any) => void>> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit() {
    const config: RedisConfig = {
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: parseInt(this.configService.get('REDIS_PORT', '6379')),
      password: this.configService.get('REDIS_PASSWORD'),
      db: parseInt(this.configService.get('REDIS_DB', '0')),
    };

    this.client = createClient({
      url: `redis://${config.password ? `:${config.password}@` : ''}${config.host}:${config.port}/${config.db}`,
    });

    this.client.on('error', (err: Error) => {
      this.logger.error('Redis client error', { error: err.message }, 'redis');
    });

    await this.client.connect();
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }
    if (this.client) {
      await this.client.quit();
    }
  }

  // Session Management
  async setSession(sessionId: string, data: any, ttl: number = 3600): Promise<void> {
    await this.client.set(`session:${sessionId}`, JSON.stringify(data), {
      EX: ttl,
    });
  }

  async getSession(sessionId: string): Promise<any> {
    const data = (await this.client.get(`session:${sessionId}`)) as string;
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.client.del(`session:${sessionId}`);
  }

  async getAllSessions(): Promise<string[]> {
    const keys = await this.client.keys('session:*');
    return keys;
  }

  async extendSession(sessionId: string, ttl: number = 3600): Promise<void> {
    await this.client.expire(`session:${sessionId}`, ttl);
  }

  // Game Data Caching
  async cacheGameData(gameId: string, data: any, ttl: number = 1800): Promise<void> {
    await this.client.set(`game:${gameId}`, JSON.stringify(data), { EX: ttl });
  }

  async getGameData(gameId: string): Promise<any> {
    const data = (await this.client.get(`game:${gameId}`)) as string;
    return data ? JSON.parse(data) : null;
  }

  async deleteGameData(gameId: string): Promise<void> {
    await this.client.del(`game:${gameId}`);
  }

  // User Session Management
  async setUserSession(
    userId: string,
    sessionData: any,
    ttl: number = 3600,
  ): Promise<void> {
    await this.client.set(`user:session:${userId}`, JSON.stringify(sessionData), {
      EX: ttl,
    });
  }

  async getUserSession(userId: string): Promise<any> {
    const data = (await this.client.get(`user:session:${userId}`)) as string;
    return data ? JSON.parse(data) : null;
  }

  async deleteUserSession(userId: string): Promise<void> {
    await this.client.del(`user:session:${userId}`);
  }

  // Partner API Key Management
  async setPartnerApiKey(
    partnerId: string,
    apiKey: string,
    ttl: number = 86400,
  ): Promise<void> {
    await this.client.set(`partner:api:${partnerId}`, apiKey, { EX: ttl });
  }

  async getPartnerApiKey(partnerId: string): Promise<string | null> {
    return (await this.client.get(`partner:api:${partnerId}`)) as string;
  }

  async deletePartnerApiKey(partnerId: string): Promise<void> {
    await this.client.del(`partner:api:${partnerId}`);
  }

  // Rate Limiting
  async checkRateLimit(key: string, limit: number, window: number): Promise<boolean> {
    const current = await this.client.incr(`rate_limit:${key}`);

    if (current === 1) {
      await this.client.expire(`rate_limit:${key}`, window);
    }

    return current <= limit;
  }

  async getRateLimitCount(key: string): Promise<number> {
    const count = (await this.client.get(`rate_limit:${key}`)) as string;
    return count ? parseInt(count) : 0;
  }

  // Pub/Sub for Real-time Events
  async publishEvent(channel: string, data: any): Promise<void> {
    if (!this.client) {
      this.logger.error('Redis client not initialized for publish', { channel }, 'redis');
      return;
    }
    try {
      await this.client.publish(channel, JSON.stringify(data));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Error publishing event',
        { channel, error: errorMessage },
        'redis',
      );
    }
  }

  /**
   * Check if Redis client is ready
   */
  isClientReady(): boolean {
    if (!this.client) {
      return false;
    }
    // Check if client is connected and ready
    const clientState = (this.client as { isReady?: boolean }).isReady;
    return clientState === true;
  }

  /**
   * Wait for Redis client to be ready (with timeout)
   */
  async waitForClientReady(timeout: number = 10000): Promise<boolean> {
    const startTime = Date.now();
    while (!this.isClientReady()) {
      if (Date.now() - startTime > timeout) {
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return true;
  }

  /**
   * Subscribe to a Redis channel
   * Multiple callbacks can be registered for the same channel
   */
  async subscribeToChannel(
    channel: string,
    callback: (data: any) => void,
  ): Promise<void> {
    // Wait for client to be ready
    const isReady = await this.waitForClientReady();
    if (!isReady || !this.client) {
      this.logger.error('Redis client not ready after timeout', { channel }, 'redis');
      return;
    }

    // Initialize subscriber if not exists
    if (!this.subscriber) {
      this.subscriber = this.client.duplicate();
      await this.subscriber.connect();
    }

    // Store callback
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());

      // Subscribe to channel if first callback
      await this.subscriber.subscribe(channel, (message: string) => {
        try {
          const data = JSON.parse(message) as unknown;
          const callbacks = this.subscriptions.get(channel);
          if (callbacks) {
            callbacks.forEach((cb) => cb(data));
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(
            'Error parsing message',
            { channel, error: errorMessage },
            'redis',
          );
        }
      });
    }

    const callbacks = this.subscriptions.get(channel);
    if (callbacks) {
      callbacks.add(callback);
    }
  }

  /**
   * Unsubscribe from a Redis channel
   */
  async unsubscribeFromChannel(
    channel: string,
    callback?: (data: any) => void,
  ): Promise<void> {
    if (!this.subscriber || !this.subscriptions.has(channel)) {
      return;
    }

    const callbacks = this.subscriptions.get(channel);
    if (callbacks) {
      if (callback) {
        callbacks.delete(callback);
      } else {
        callbacks.clear();
      }

      // Unsubscribe if no more callbacks
      if (callbacks.size === 0) {
        await this.subscriber.unsubscribe(channel);
        this.subscriptions.delete(channel);
      }
    }
  }

  // Generic Key-Value Operations
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const options = ttl ? { EX: ttl } : undefined;
    await this.client.set(key, JSON.stringify(value), options);
  }

  async get(key: string): Promise<any> {
    const data = (await this.client.get(key)) as string;
    return data ? JSON.parse(data) : null;
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  // String operations (for simple values like OTP)
  async setString(key: string, value: string, ttl?: number): Promise<void> {
    const options = ttl ? { EX: ttl } : undefined;
    await this.client.set(key, value, options);
  }

  async getString(key: string): Promise<string | null> {
    const data = (await this.client.get(key)) as string;
    return data || null;
  }

  async getKeys(pattern: string): Promise<string[]> {
    return await this.client.keys(pattern);
  }

  // Health Check
  async ping(): Promise<string> {
    return await this.client.ping();
  }

  async getInfo(): Promise<any> {
    const info = await this.client.info();
    return info;
  }

  // User IP Tracking
  /**
   * Add IP to user's IP set in Redis
   * @param userId User ID
   * @param ip IP address
   * @param ttl TTL in seconds (default: 3600 = 1 hour)
   */
  async addUserIp(userId: string, ip: string, ttl: number = 3600): Promise<void> {
    const key = `user:ips:${userId}`;
    await this.client.sAdd(key, ip);
    await this.client.expire(key, ttl);
  }

  /**
   * Get all IPs for a user from Redis
   * @param userId User ID
   * @returns Array of IP addresses
   */
  async getUserIps(userId: string): Promise<string[]> {
    const key = `user:ips:${userId}`;
    return await this.client.sMembers(key);
  }

  /**
   * Remove IP from user's IP set
   * @param userId User ID
   * @param ip IP address
   */
  async removeUserIp(userId: string, ip: string): Promise<void> {
    const key = `user:ips:${userId}`;
    await this.client.sRem(key, ip);
  }

  /**
   * Get all user IP keys from Redis (for scheduler)
   * @returns Array of keys matching pattern user:ips:*
   */
  async getUserIpKeys(): Promise<string[]> {
    return await this.client.keys('user:ips:*');
  }

  /**
   * Delete user IP key from Redis (after processing by scheduler)
   * @param key Redis key
   */
  async deleteUserIpKey(key: string): Promise<void> {
    await this.client.del(key);
  }

  // Global Blocked IPs Cache
  /**
   * Cache all globally blocked IPs in Redis
   * @param ips Array of blocked IP addresses
   * @param ttl TTL in seconds (default: 1800 = 30 minutes)
   */
  async cacheGlobalBlockedIps(ips: string[], ttl: number = 1800): Promise<void> {
    const key = 'blocked:ips:global';
    // Clear existing set
    await this.client.del(key);
    // Add all blocked IPs (if any)
    if (ips.length > 0) {
      await this.client.sAdd(key, ips);
      // Set TTL only if there are IPs
      await this.client.expire(key, ttl);
    }
    // If ips.length === 0, cache is cleared (no IPs blocked)
  }

  /**
   * Get globally blocked IPs from cache
   * @returns Array of blocked IP addresses or null if cache miss
   */
  async getGlobalBlockedIps(): Promise<string[] | null> {
    const key = 'blocked:ips:global';
    const exists = await this.client.exists(key);
    if (exists === 0) {
      return null; // Cache miss
    }
    return await this.client.sMembers(key);
  }

  /**
   * Check if an IP is globally blocked (from cache)
   * @param ip IP address to check
   * @returns true if blocked, false otherwise
   */
  async isIpGloballyBlocked(ip: string): Promise<boolean> {
    const key = 'blocked:ips:global';
    const exists = await this.client.exists(key);
    if (exists === 0) {
      return false; // Cache miss, assume not blocked
    }
    const isMember = await this.client.sIsMember(key, ip);
    return isMember === 1;
  }

  /**
   * Clear globally blocked IPs cache (called when admin updates block status)
   */
  async clearGlobalBlockedIpsCache(): Promise<void> {
    await this.client.del('blocked:ips:global');
  }

  // Legacy methods (deprecated, use global methods instead)
  /**
   * @deprecated Use cacheGlobalBlockedIps instead
   */
  async cacheBlockedIps(ips: string[], ttl: number = 1800): Promise<void> {
    return this.cacheGlobalBlockedIps(ips, ttl);
  }

  /**
   * @deprecated Use getGlobalBlockedIps instead
   */
  async getBlockedIps(): Promise<string[] | null> {
    return this.getGlobalBlockedIps();
  }

  /**
   * @deprecated Use isIpGloballyBlocked instead
   */
  async isIpBlocked(ip: string): Promise<boolean> {
    return this.isIpGloballyBlocked(ip);
  }

  /**
   * @deprecated Use clearGlobalBlockedIpsCache instead
   */
  async clearBlockedIpsCache(): Promise<void> {
    return this.clearGlobalBlockedIpsCache();
  }

  /**
   * Cache blocked IPs for a specific user
   * @param userId User ID
   * @param ips Array of blocked IP addresses for this user
   * @param ttl TTL in seconds (default: 1800 = 30 minutes)
   */
  async cacheBlockedIpsByUserId(
    userId: string,
    ips: string[],
    ttl: number = 1800,
  ): Promise<void> {
    const key = `blocked:ips:user:${userId}`;
    // Clear existing set
    await this.client.del(key);
    // Add all blocked IPs (if any)
    if (ips.length > 0) {
      await this.client.sAdd(key, ips);
      // Set TTL only if there are IPs
      await this.client.expire(key, ttl);
    }
    // If ips.length === 0, cache is cleared (no IPs blocked for this user)
  }

  /**
   * Get blocked IPs for a specific user from cache
   * @param userId User ID
   * @returns Array of blocked IP addresses or null if cache miss
   */
  async getBlockedIpsByUserId(userId: string): Promise<string[] | null> {
    const key = `blocked:ips:user:${userId}`;
    const exists = await this.client.exists(key);
    if (exists === 0) {
      return null;
    }
    return await this.client.sMembers(key);
  }

  /**
   * Clear blocked IPs cache for a specific user
   * @param userId User ID
   */
  async clearBlockedIpsCacheByUserId(userId: string): Promise<void> {
    await this.client.del(`blocked:ips:user:${userId}`);
  }
}
