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

    this.client.on('error', (err) => this.logger.error('Redis client error', { error: err.message }, 'redis'));

    await this.client.connect();
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  // Session Management
  async setSession(sessionId: string, data: any, ttl: number = 3600): Promise<void> {
    await this.client.set(
      `session:${sessionId}`,
      JSON.stringify(data),
      { EX: ttl }
    );
  }

  async getSession(sessionId: string): Promise<any> {
    const data = await this.client.get(`session:${sessionId}`) as string;
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
    await this.client.set(
      `game:${gameId}`,
      JSON.stringify(data),
      { EX: ttl }
    );
  }

  async getGameData(gameId: string): Promise<any> {
    const data = await this.client.get(`game:${gameId}`) as string;
    return data ? JSON.parse(data) : null;
  }

  async deleteGameData(gameId: string): Promise<void> {
    await this.client.del(`game:${gameId}`);
  }

  // User Session Management
  async setUserSession(userId: string, sessionData: any, ttl: number = 3600): Promise<void> {
    await this.client.set(
      `user:session:${userId}`,
      JSON.stringify(sessionData),
      { EX: ttl }
    );
  }

  async getUserSession(userId: string): Promise<any> {
    const data = await this.client.get(`user:session:${userId}`) as string;
    return data ? JSON.parse(data) : null;
  }

  async deleteUserSession(userId: string): Promise<void> {
    await this.client.del(`user:session:${userId}`);
  }

  // Partner API Key Management
  async setPartnerApiKey(partnerId: string, apiKey: string, ttl: number = 86400): Promise<void> {
    await this.client.set(
      `partner:api:${partnerId}`,
      apiKey,
      { EX: ttl }
    );
  }

  async getPartnerApiKey(partnerId: string): Promise<string | null> {
    return await this.client.get(`partner:api:${partnerId}`) as string;
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
    const count = await this.client.get(`rate_limit:${key}`) as string;
    return count ? parseInt(count) : 0;
  }

  // Pub/Sub for Real-time Events
  async publishEvent(channel: string, data: any): Promise<void> {
    if (!this.client) {
      this.logger.error('Redis client not initialized for publish', { channel }, 'redis');
      return;
    }
    await this.client.publish(channel, JSON.stringify(data));
  }

  async subscribeToChannel(channel: string, callback: (data: any) => void): Promise<void> {
    if (!this.client) {
      this.logger.error('Redis client not initialized', { channel }, 'redis');
      return;
    }

    const subscriber = this.client.duplicate();
    await subscriber.connect();
    
    await subscriber.subscribe(channel, (message) => {
      try {
        const data = JSON.parse(message);
        callback(data);
      } catch (error) {
        this.logger.error('Error parsing message', { channel, error: (error as Error).message }, 'redis');
      }
    });
  }

  // Generic Key-Value Operations
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const options = ttl ? { EX: ttl } : undefined;
    await this.client.set(key, JSON.stringify(value), options);
  }

  async get(key: string): Promise<any> {
    const data = await this.client.get(key) as string;
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
    const data = await this.client.get(key) as string;
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
}
