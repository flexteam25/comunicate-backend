import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const TIMESTAMP_TOLERANCE_MS = 60 * 1000;

function sortObjectKeys(obj: Record<string, unknown>): Record<string, unknown> {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj;
  return Object.keys(obj)
    .sort()
    .reduce((acc, k) => {
      const v = obj[k];
      acc[k] =
        typeof v === 'object' && v !== null && !Array.isArray(v)
          ? sortObjectKeys(v as Record<string, unknown>)
          : v;
      return acc;
    }, {} as Record<string, unknown>);
}

function buildCanonical(
  method: string,
  pathStr: string,
  query: Record<string, string>,
  body: Record<string, unknown>,
  timestamp: string,
): string {
  const queryString = Object.keys(query)
    .sort()
    .map((k) => `${k}=${query[k]}`)
    .join('&');
  const bodyString =
    body && Object.keys(body).length > 0
      ? JSON.stringify(sortObjectKeys(body))
      : '';
  return `${method}\n${pathStr}\n${queryString}\n${bodyString}\n${timestamp}`;
}

@Injectable()
export class GameCallbackGuard implements CanActivate {
  private readonly publicKeyPem: string | null = null;

  constructor(private readonly configService: ConfigService) {
    const keyPath = this.configService.get<string>('GAME_PUBLIC_KEY') || '';
    if (keyPath.trim()) {
      const resolved = path.isAbsolute(keyPath)
        ? keyPath
        : path.join(process.cwd(), keyPath);
      try {
        this.publicKeyPem = fs.readFileSync(resolved, 'utf8');
      } catch (err) {
        console.error('GameCallbackGuard: failed to load GAME_PUBLIC_KEY', {
          path: resolved,
          message: (err as Error).message,
        });
      }
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const xKey = request.headers['x-key'] as string | undefined;
    const xSignature = request.headers['x-signature'] as string | undefined;
    const xTimestamp = request.headers['x-timestamp'] as string | undefined;

    if (!xKey || !xSignature || !xTimestamp) {
      throw new UnauthorizedException('Missing game callback headers');
    }

    const timestamp = parseInt(xTimestamp, 10);
    if (
      Number.isNaN(timestamp) ||
      Math.abs(Date.now() - timestamp) > TIMESTAMP_TOLERANCE_MS
    ) {
      throw new UnauthorizedException('Invalid or expired timestamp');
    }

    if (!this.publicKeyPem) {
      throw new UnauthorizedException('Game callback not configured');
    }

    const pathStr = (request.originalUrl || request.url || '').split('?')[0] || request.path || '/';
    const query = (request.query as Record<string, string>) || {};
    const body = (request.body as Record<string, unknown>) || {};
    const canonical = buildCanonical(
      request.method,
      pathStr,
      query,
      body,
      xTimestamp,
    );

    const publicKey = this.publicKeyPem.replace(/\\n/g, '\n');
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(canonical);
    const valid = verifier.verify(publicKey, xSignature, 'base64');

    if (!valid) {
      throw new UnauthorizedException('Invalid signature');
    }
    return true;
  }
}
