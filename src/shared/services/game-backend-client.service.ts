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

const DEFAULT_PATH_SYNC_POINT = '/api/partner/sync-point';
const DEFAULT_PATH_REVOKE = '/api/auth/partner/revoke';
const DEFAULT_PATH_AUTHENTICATE = '/api/auth/partner/authenticate';
const DEFAULT_PATH_NOTIFY_BET_LIMITS_CHANGED = '/api/auth/partner/notify-bet-limits-changed';

@Injectable()
export class GameBackendClientService {
  /** Base URL for auth (launch) and revoke. Uses GAME_BASE_URL. */
  private readonly baseUrl: string;
  /** Base URL for sync-point only. Uses GAME_MANAGEMENT_URL. */
  private readonly managementBaseUrl: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly privateKeyPem: string | null = null;
  private readonly pathAuthenticate: string;
  private readonly pathSyncPoint: string;
  private readonly pathRevoke: string;
  private readonly pathNotifyBetLimitsChanged: string;
  /** Client for auth (launch) and revoke (GAME_BASE_URL). */
  private readonly client: AxiosInstance;
  /** Client for sync-point only (GAME_MANAGEMENT_URL). */
  private readonly managementClient: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = (this.configService.get<string>('GAME_BASE_URL') || '').replace(/\/$/, '');
    this.managementBaseUrl = (this.configService.get<string>('GAME_MANAGEMENT_URL') || '').replace(/\/$/, '');
    this.apiKey = this.configService.get<string>('GAME_PARTNER_API_KEY') || '';
    this.apiSecret = this.configService.get<string>('GAME_PARTNER_API_SECRET') || '';
    this.pathAuthenticate =
      this.configService.get<string>('GAME_PARTNER_AUTHENTICATE_PATH') || DEFAULT_PATH_AUTHENTICATE;
    this.pathSyncPoint =
      this.configService.get<string>('GAME_PARTNER_SYNC_POINT_PATH') || DEFAULT_PATH_SYNC_POINT;
    this.pathRevoke =
      this.configService.get<string>('GAME_PARTNER_REVOKE_PATH') || DEFAULT_PATH_REVOKE;
    this.pathNotifyBetLimitsChanged =
      this.configService.get<string>('GAME_PARTNER_NOTIFY_BET_LIMITS_CHANGED_PATH') ||
      DEFAULT_PATH_NOTIFY_BET_LIMITS_CHANGED;
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
    this.managementClient = axios.create({
      baseURL: this.managementBaseUrl,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /** Whether launch game is configured (GAME_BASE_URL + keys). */
  isConfigured(): boolean {
    return !!(this.baseUrl && this.apiKey && this.apiSecret && this.privateKeyPem);
  }

  /** Whether sync-point can be called (GAME_MANAGEMENT_URL + keys). */
  isSyncPointConfigured(): boolean {
    return !!(this.managementBaseUrl && this.apiKey && this.apiSecret && this.privateKeyPem);
  }

  /**
   * Notify game backend that bet limits have changed. Called after admin updates game_bet_limits.
   * POST /api/auth/partner/notify-bet-limits-changed with body { limits }. Uses GAME_BASE_URL.
   */
  async notifyBetLimitsChanged(limits: Record<string, unknown>): Promise<void> {
    if (!this.isConfigured()) {
      return;
    }
    const method = 'POST';
    const pathStr = this.pathNotifyBetLimitsChanged;
    const query: Record<string, string> = {};
    const body: Record<string, unknown> = { limits };

    const timestamp = String(Date.now());
    const canonical = buildCanonical(method, pathStr, query, body, timestamp);
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(canonical);
    const signature = sign.sign({ key: this.privateKeyPem! }, 'base64');

    await this.client.request({
      method: 'POST',
      url: pathStr,
      data: body,
      headers: {
        'x-key': this.apiKey,
        'x-sec': this.apiSecret,
        'x-signature': signature,
        'x-timestamp': timestamp,
      },
    });
  }

  /**
   * Revoke user on game backend (e.g. when user is disabled or logs out).
   * POST /api/auth/partner/revoke with body { userUuid }, same signature as launch. Uses GAME_BASE_URL.
   */
  async revokeUser(userUuid: string): Promise<void> {
    if (!this.isConfigured()) {
      return;
    }
    const method = 'POST';
    const pathStr = this.pathRevoke;
    const query: Record<string, string> = {};
    const body: Record<string, unknown> = { userUuid };

    const timestamp = String(Date.now());
    const canonical = buildCanonical(method, pathStr, query, body, timestamp);
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(canonical);
    const signature = sign.sign({ key: this.privateKeyPem! }, 'base64');

    await this.client.request({
      method: 'POST',
      url: pathStr,
      data: body,
      headers: {
        'x-key': this.apiKey,
        'x-sec': this.apiSecret,
        'x-signature': signature,
        'x-timestamp': timestamp,
      },
    });
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
    const pathStr = this.pathSyncPoint;
    const query: Record<string, string> = {};
    const body: Record<string, unknown> = { userUuid, point };
    if (txRef != null) body.txRef = txRef;

    const timestamp = String(Date.now());
    const canonical = buildCanonical(method, pathStr, query, body, timestamp);
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(canonical);
    const signature = sign.sign({ key: this.privateKeyPem! }, 'base64');

    await this.managementClient.request({
      method: 'POST',
      url: pathStr,
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
