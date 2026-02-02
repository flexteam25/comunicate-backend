import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import axios, { AxiosInstance } from 'axios';

export interface LaunchGamePayload {
  userUuid: string;
  userName: string;
  userNickName: string;
  balance: number;
  userAvatar?: string;
  userEmail?: string;
  address?: Record<string, unknown>;
  campaignCode?: string;
}

function sortObjectKeys(obj: Record<string, unknown>): Record<string, unknown> {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj;
  return Object.keys(obj).sort().reduce((acc, k) => {
    const v = obj[k];
    acc[k] = (typeof v === 'object' && v !== null && !Array.isArray(v))
      ? sortObjectKeys(v as Record<string, unknown>)
      : v;
    return acc;
  }, {} as Record<string, unknown>);
}

function buildCanonical(method: string, pathStr: string, query: Record<string, string>, body: Record<string, unknown>, timestamp: string): string {
  const queryString = Object.keys(query).sort().map((k) => `${k}=${query[k]}`).join('&');
  const bodyString = Object.keys(body).length > 0 ? JSON.stringify(sortObjectKeys(body)) : '';
  return `${method}\n${pathStr}\n${queryString}\n${bodyString}\n${timestamp}`;
}

const PATH_SYNC_POINT = '/api/partner/sync-point';

@Injectable()
export class GameBackendClientService {
  private readonly baseUrl: string;
  /** Management server URL (sync-point). Falls back to baseUrl if not set. */
  private readonly managementUrl: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly privateKeyPem: string | null = null;
  private readonly pathAuthenticate = '/api/auth/partner/authenticate';
  private readonly client: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = (this.configService.get<string>('GAME_BASE_URL') || '').replace(/\/$/, '');
    const management = (this.configService.get<string>('GAME_MANAGEMENT_URL') || '').replace(/\/$/, '');
    this.managementUrl = management || this.baseUrl;
    this.apiKey = this.configService.get<string>('GAME_PARTNER_API_KEY') || '';
    this.apiSecret = this.configService.get<string>('GAME_PARTNER_API_SECRET') || '';
    const keyPath = this.configService.get<string>('GAME_PARTNER_PRIVATE_KEY') || '';
    if (keyPath.trim()) {
      const resolved = path.isAbsolute(keyPath) ? keyPath : path.join(process.cwd(), keyPath);
      try {
        this.privateKeyPem = fs.readFileSync(resolved, 'utf8');
      } catch (err) {
        console.error('GameBackendClientService: failed to load private key', { path: resolved, message: (err as Error).message });
      }
    }
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  isConfigured(): boolean {
    return !!(this.baseUrl && this.apiKey && this.apiSecret && this.privateKeyPem);
  }

  /** Whether sync-point can be called (management URL + RSA key). */
  isSyncPointConfigured(): boolean {
    return !!(this.managementUrl && this.apiKey && this.apiSecret && this.privateKeyPem);
  }

  /**
   * Sync user point to game backend (management server). Call after any point change on partner.
   * Game backend updates POINT in a DB transaction and emits balanceUpdated to user's socket.
   */
  async syncPoint(userUuid: string, point: number, txRef?: string): Promise<void> {
    if (!this.isSyncPointConfigured()) {
      return;
    }
    const method = 'POST';
    const pathStr = PATH_SYNC_POINT;
    const query: Record<string, string> = {};
    const body: Record<string, unknown> = { userUuid, point };
    if (txRef != null) body.txRef = txRef;

    const timestamp = String(Date.now());
    const canonical = buildCanonical(method, pathStr, query, body, timestamp);
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(canonical);
    const signature = sign.sign({ key: this.privateKeyPem! }, 'base64');

    const url = `${this.managementUrl}${pathStr}`;
    await this.client.request({
      method: 'POST',
      url,
      data: body,
      headers: {
        'x-key': this.apiKey,
        'x-sec': this.apiSecret,
        'x-signature': signature,
        'x-timestamp': timestamp,
      },
    });
  }

  async launchGame(payload: LaunchGamePayload): Promise<{ url: string }> {
    if (!this.isConfigured()) {
      throw new Error('Minigame partner config missing: GAME_BASE_URL, GAME_PARTNER_API_KEY, GAME_PARTNER_API_SECRET, GAME_PARTNER_PRIVATE_KEY');
    }
    const method = 'POST';
    const pathStr = this.pathAuthenticate;
    const query: Record<string, string> = {};
    const body: Record<string, unknown> = {
      userUuid: payload.userUuid,
      userName: payload.userName,
      userNickName: payload.userNickName,
      balance: payload.balance,
    };
    if (payload.userAvatar != null) body.userAvatar = payload.userAvatar;
    if (payload.userEmail != null) body.userEmail = payload.userEmail;
    if (payload.address != null) body.address = payload.address;
    if (payload.campaignCode != null) body.campaignCode = payload.campaignCode;

    const timestamp = String(Date.now());
    const canonical = buildCanonical(method, pathStr, query, body, timestamp);
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(canonical);
    const signature = sign.sign({ key: this.privateKeyPem! }, 'base64');

    const response = await this.client.request<{ status?: boolean; url?: string; message?: string }>({
      method: 'POST',
      url: this.pathAuthenticate,
      data: body,
      headers: {
        'x-key': this.apiKey,
        'x-sec': this.apiSecret,
        'x-signature': signature,
        'x-timestamp': timestamp,
      },
    });

    const data = response.data;
    if (data?.status === true && typeof data?.url === 'string') {
      return { url: data.url };
    }
    throw new Error(data?.message || 'Game backend did not return url');
  }
}
