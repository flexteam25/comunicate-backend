import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;

  constructor(private readonly configService: ConfigService) {}

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

    this.client.on('error', (err) => this.logger.error('Redis Client Error', err));
    this.client.on('connect', () => this.logger.log('Redis connecting...'));
    this.client.on('ready', () => this.logger.log('Redis connected successfully'));
    this.client.on('end', () => this.logger.log('Redis connection ended'));

    await this.client.connect();
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis connection closed');
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
      this.logger.error('Redis client not initialized for publish');
      return;
    }
    await this.client.publish(channel, JSON.stringify(data));
  }

  async subscribeToChannel(channel: string, callback: (data: any) => void): Promise<void> {
    if (!this.client) {
      this.logger.error('Redis client not initialized');
      return;
    }

    this.logger.log(`Creating subscriber for channel: ${channel}`);
    const subscriber = this.client.duplicate();
    await subscriber.connect();
    this.logger.log(`Subscriber connected for channel: ${channel}`);
    
    await subscriber.subscribe(channel, (message) => {
      this.logger.log(`📨 Received raw message on ${channel}: ${message.substring(0, 100)}...`);
      try {
        const data = JSON.parse(message);
        this.logger.log(`📨 Parsed data for ${channel}:`, data);
        callback(data);
        this.logger.log(`Callback executed for ${channel}`);
      } catch (error) {
        this.logger.error(`Error parsing message from channel ${channel}:`, error);
      }
    });
    
    this.logger.log(`Successfully subscribed to channel: ${channel}`);
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
