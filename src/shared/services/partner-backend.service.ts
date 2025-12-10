import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Partner } from '../../domains/game/entities/partner.entity';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { isIpInTrustList } from '../utils/ip.util';
import { PARTNER_BACKEND_ENDPOINTS } from '../constants/partner-backend.const';

/**
 * Service for calling partner backend APIs
 * Handles trust IP/domain validation and authentication
 */
@Injectable()
export class PartnerBackendService {
  private readonly logger = new Logger(PartnerBackendService.name);
  private readonly axiosInstances = new Map<number, AxiosInstance>();
  private readonly keysBasePath: string;

  constructor(
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
  ) {
    // Get keys directory from environment or use default
    // Resolve absolute path from project root (minigame-api) to keys/partners
    this.keysBasePath = path.resolve(process.cwd(), 'keys/partners');
  }

  /**
   * Get RSA private key from file for partner
   */
  private getPartnerPrivateKey(partner: Partner): string {
    const keyPath = path.join(this.keysBasePath, partner.username, 'private_key.pem');

    try {
      if (!fs.existsSync(keyPath)) {
        this.logger.error(
          `Private key not found for partner ${partner.username}: ${keyPath}`,
        );
        throw new BadRequestException('Partner configuration error');
      }

      return fs.readFileSync(keyPath, 'utf8');
    } catch (error) {
      this.logger.error(
        `Failed to read private key for partner ${partner.username}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException('Partner configuration error');
    }
  }

  /**
   * Get RSA public key from file for partner
   */
  getPartnerPublicKey(partner: Partner): string {
    const keyPath = path.join(this.keysBasePath, partner.username, 'public_key.pem');

    try {
      if (!fs.existsSync(keyPath)) {
        this.logger.error(
          `Public key not found for partner ${partner.username}: ${keyPath}`,
        );
        throw new BadRequestException('Partner configuration error');
      }

      return fs.readFileSync(keyPath, 'utf8');
    } catch (error) {
      this.logger.error(
        `Failed to read public key for partner ${partner.username}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException('Partner configuration error');
    }
  }

  /**
   * Get or create axios instance for partner
   */
  private getAxiosInstance(partner: Partner): AxiosInstance {
    if (!this.axiosInstances.has(partner.uid)) {
      const instance = axios.create({
        baseURL: partner.backend_url,
        timeout: 10000, // 10 seconds
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Add request interceptor for RSA signature authentication
      instance.interceptors.request.use((config) => {
        // Read private key from file
        const privateKey = this.getPartnerPrivateKey(partner);

        // Build signature payload
        const method = (config.method || 'POST').toUpperCase();
        const requestPath = config.url || '/';
        const queryString = this.buildQueryString(
          (config.params as Record<string, any>) || {},
        );
        const bodyString = config.data ? JSON.stringify(config.data) : '';
        const timestamp = Date.now().toString();

        const signaturePayload = `${method}\n${requestPath}\n${queryString}\n${bodyString}\n${timestamp}`;

        // Sign payload with RSA private key
        const signature = this.signWithRsa(signaturePayload, privateKey);

        // Add headers for RSA authentication
        config.headers['x-key'] = partner.api_key; // Use api_key for identification
        config.headers['x-signature'] = signature;
        config.headers['x-timestamp'] = timestamp;

        return config;
      });

      this.axiosInstances.set(partner.uid, instance);
    }

    const instance = this.axiosInstances.get(partner.uid);
    if (!instance) {
      throw new Error('Failed to create axios instance');
    }
    return instance;
  }

  /**
   * Build query string from query params
   */
  private buildQueryString(params: Record<string, any>): string {
    if (!params || Object.keys(params).length === 0) {
      return '';
    }

    const sortedKeys = Object.keys(params).sort();
    return sortedKeys
      .map((key) => {
        const value = params[key] as unknown;
        const stringValue =
          typeof value === 'string' || typeof value === 'number'
            ? String(value)
            : JSON.stringify(value);
        return `${key}=${encodeURIComponent(stringValue)}`;
      })
      .join('&');
  }

  /**
   * Sign payload with RSA private key
   */
  private signWithRsa(payload: string, privateKey: string): string {
    try {
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(payload, 'utf8');
      return sign.sign(privateKey, 'base64');
    } catch (error) {
      this.logger.error(
        `Failed to sign request: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException('Request signing failed');
    }
  }

  /**
   * Validate partner backend request (from partner to game backend)
   * Checks IP, domain, and API credentials
   *
   * Note: This uses api_key and api_secret_hash for authentication
   * RSA keys (to_partner_pub/priv) are used when game backend calls partner backend
   */
  async validatePartnerBackendRequest(
    apiKey: string,
    apiSecret: string,
    requestIp?: string,
    requestDomain?: string,
  ): Promise<Partner> {
    const partner = await this.partnerRepository.findOne({
      where: { api_key: apiKey, is_active: true },
    });

    if (!partner) {
      throw new UnauthorizedException('Authentication failed');
    }

    // Verify API secret using hash comparison
    const isValidSecret = this.verifyApiSecret(apiSecret, partner.api_secret_hash);
    if (!isValidSecret) {
      throw new UnauthorizedException('Authentication failed');
    }

    // Validate IP if trust_ips is configured
    // Check both IPv4 and IPv6 versions
    if (partner.trust_ips && requestIp) {
      const trustIps = JSON.parse(partner.trust_ips) as string[];
      if (!isIpInTrustList(requestIp, trustIps)) {
        throw new UnauthorizedException('Authentication failed');
      }
    }

    // Validate domain if trust_domains is configured
    if (partner.trust_domains && requestDomain) {
      const trustDomains = JSON.parse(partner.trust_domains) as string[];

      // Wildcard "*" means accept all domains
      if (trustDomains.includes('*')) {
        // Accept all domains
      } else {
        // Check exact match or subdomain match
        const isDomainAllowed = trustDomains.some(
          (domain: string) =>
            requestDomain === domain || requestDomain.endsWith(`.${domain}`),
        );
        if (!isDomainAllowed) {
          throw new UnauthorizedException('Authentication failed');
        }
      }
    }

    return partner;
  }

  /**
   * Verify API secret using hash comparison
   * Partner sends plaintext secret, we hash it and compare with stored hash
   */
  private verifyApiSecret(plainSecret: string, hashedSecret: string): boolean {
    const hash = crypto.createHash('sha256').update(plainSecret).digest('hex');
    return hash === hashedSecret;
  }

  /**
   * Call partner backend API for wallet operations
   * Example: Deduct balance, Add balance, etc.
   */
  async callPartnerBackend(
    partnerId: number,
    endpoint: string,
    data: unknown,
  ): Promise<unknown> {
    const partner = await this.partnerRepository.findOne({
      where: { uid: partnerId, is_active: true },
    });

    if (!partner) {
      throw new BadRequestException('Partner not found');
    }

    if (!partner.backend_url) {
      throw new BadRequestException('Partner configuration error');
    }

    try {
      const axiosInstance = this.getAxiosInstance(partner);
      const response = await axiosInstance.post(endpoint, data);
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error calling partner backend ${partner.uid}: ${errorMessage}`,
        errorStack,
      );
      throw new BadRequestException('Partner backend request failed');
    }
  }

  /**
   * Deduct user balance (seamless wallet operation)
   */
  async deductBalance(
    partnerId: number,
    userId: string,
    amount: number,
  ): Promise<boolean> {
    const result = (await this.callPartnerBackend(partnerId, '/api/wallet/deduct', {
      userId,
      amount,
    })) as boolean;
    return result;
  }

  /**
   * Add user balance (seamless wallet operation)
   */
  async addBalance(partnerId: number, userId: string, amount: number): Promise<boolean> {
    const result = (await this.callPartnerBackend(partnerId, '/api/wallet/add', {
      userId,
      amount,
    })) as boolean;
    return result;
  }

  /**
   * Get user balance (seamless wallet operation)
   */
  async getBalance(partnerId: number, userId: string): Promise<number> {
    const result = (await this.callPartnerBackend(partnerId, '/api/wallet/balance', {
      userId,
    })) as { balance?: number };
    return result.balance || 0;
  }

  /**
   * Call partner backend callback to confirm transaction
   * @param partner Partner entity
   * @param userBalance User's current balance
   * @param betAmount Bet amount to deduct
   * @returns Callback response with status and balance
   */
  async callPartnerCallback(
    partner: Partner,
    userBalance: number,
    betAmount: number,
  ): Promise<{ status: string; balance: number }> {
    if (!partner.backend_url) {
      throw new BadRequestException('Partner configuration error');
    }

    try {
      // Calculate res parameter: user balance - bet amount
      const res = userBalance - betAmount;

      // Build callback URL with res parameter
      const callbackPath = PARTNER_BACKEND_ENDPOINTS.CALLBACK;
      const callbackUrl = `${partner.backend_url}${callbackPath}?res=${res}`;

      // Read private key from file
      const privateKey = this.getPartnerPrivateKey(partner);

      // Build signature payload: GET\n/mock/callback\nres={res}\n\n{timestamp}
      const method = 'GET';
      const path = callbackPath;
      const queryString = `res=${res}`;
      const bodyString = '';
      const timestamp = Date.now().toString();

      const signaturePayload = `${method}\n${path}\n${queryString}\n${bodyString}\n${timestamp}`;

      // Sign payload with RSA private key
      const signature = this.signWithRsa(signaturePayload, privateKey);

      // Make request with signature headers
      const response = await axios.get(callbackUrl, {
        headers: {
          'x-key': partner.api_key,
          'x-signature': signature,
          'x-timestamp': timestamp,
        },
        timeout: 5000, // 5 seconds
      });

      const result = response.data as { status: string; balance: number };
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error calling partner callback for partner ${partner.uid}: ${errorMessage}`,
        errorStack,
      );
      throw new BadRequestException('Partner callback request failed');
    }
  }
}
