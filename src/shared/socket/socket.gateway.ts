import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { JwtService } from '../services/jwt.service';
import { RedisService } from '../redis/redis.service';
import { RedisChannel, SocketEvent, SocketRoom } from './socket-channels';
import { IUserTokenRepository } from '../../modules/auth/infrastructure/persistence/repositories/user-token.repository';
import { IAdminTokenRepository } from '../../modules/admin/infrastructure/persistence/repositories/admin-token.repository';
import { IAdminRepository } from '../../modules/admin/infrastructure/persistence/repositories/admin.repository';
import { LoggerService } from '../logger/logger.service';

interface AuthenticatedSocket extends Socket {
  data: {
    userId?: string;
    email?: string;
    adminId?: string;
    isAdmin?: boolean;
  };
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/',
})
@Injectable()
export class SocketGateway
  implements OnModuleInit, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private subscriptionsSetup = false; // Guard to prevent duplicate subscriptions
  private siteCreatedHandler: ((data: any) => void) | null = null; // Store handler to prevent duplicates

  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    @Inject('IUserTokenRepository')
    private readonly userTokenRepository: IUserTokenRepository,
    @Inject('IAdminTokenRepository')
    private readonly adminTokenRepository: IAdminTokenRepository,
    @Inject('IAdminRepository')
    private readonly adminRepository: IAdminRepository,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit() {
    // Prevent duplicate subscriptions
    if (this.subscriptionsSetup) {
      this.logger.warn('Redis subscriptions already setup, skipping', {}, 'socket');
      return;
    }

    // Wait for Redis to be ready, then setup subscriptions
    // Retry up to 10 times with 500ms delay
    let retries = 0;
    const maxRetries = 10;

    while (retries < maxRetries) {
      if (this.redisService.isClientReady()) {
        await this.setupRedisSubscriptions();
        this.subscriptionsSetup = true;
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      retries++;
    }

    this.logger.error(
      'Redis client not ready after max retries, attempting to setup subscriptions anyway',
      {},
      'socket',
    );
    await this.setupRedisSubscriptions();
    this.subscriptionsSetup = true;
  }

  afterInit() {
    // Socket Gateway initialized
  }

  private async setupRedisSubscriptions() {
    try {
      // Subscribe to site:created (public event)
      // Use stored handler to prevent duplicate subscriptions
      if (!this.siteCreatedHandler) {
        this.siteCreatedHandler = (data: any) => {
          this.server.to(SocketRoom.PUBLIC).emit(SocketEvent.SITE_CREATED, data);
        };
      }

      await this.redisService.subscribeToChannel(
        RedisChannel.SITE_CREATED,
        this.siteCreatedHandler,
      );

      // Subscribe to site:verified (send to partner user and all admins)
      await this.redisService.subscribeToChannel(
        RedisChannel.SITE_VERIFIED,
        (data: unknown) => {
          const eventData = data as { userId?: string };
          if (eventData.userId) {
            // Send to specific partner user
            const userRoom = `${SocketRoom.USER}.${eventData.userId}`;
            this.server.to(userRoom).emit(SocketEvent.SITE_VERIFIED, data);
          }
          // Always send to admin room
          this.server.to(SocketRoom.ADMIN).emit(SocketEvent.SITE_VERIFIED, data);
        },
      );

      // Subscribe to point:updated (private event per user)
      await this.redisService.subscribeToChannel(
        RedisChannel.POINT_UPDATED,
        (data: unknown) => {
          const eventData = data as { userId?: string };
          if (eventData.userId) {
            const userRoom = `${SocketRoom.USER}.${eventData.userId}`;
            this.server.to(userRoom).emit(SocketEvent.POINT_UPDATED, data);
          } else {
            this.logger.error('point:updated event missing userId', { data }, 'socket');
          }
        },
      );

      // Subscribe to role:updated (private event per user)
      await this.redisService.subscribeToChannel(
        RedisChannel.ROLE_UPDATED,
        (data: unknown) => {
          const eventData = data as { userId?: string };
          if (eventData.userId) {
            const userRoom = `${SocketRoom.USER}.${eventData.userId}`;
            this.server.to(userRoom).emit(SocketEvent.ROLE_UPDATED, data);
          } else {
            this.logger.error('role:updated event missing userId', { data }, 'socket');
          }
        },
      );

      // Subscribe to inquiry:created (event for all admins)
      await this.redisService.subscribeToChannel(RedisChannel.INQUIRY_CREATED, (data) => {
        this.server.to(SocketRoom.ADMIN).emit(SocketEvent.INQUIRY_CREATED, data);
      });

      // Subscribe to inquiry:replied (event for both user and admin)
      await this.redisService.subscribeToChannel(
        RedisChannel.INQUIRY_REPLIED,
        (data: unknown) => {
          const eventData = data as {
            userId?: string;
            id?: string;
            title?: string;
            category?: string;
            message?: string;
            images?: string[];
            status?: string;
            adminReply?: string;
            repliedAt?: Date;
            createdAt?: Date;
            updatedAt?: Date;
            adminId?: string;
            admin?: any;
            user?: any;
          };
          if (eventData.userId) {
            // Transform to user format (same as GET api/support/inquiries)
            const userFormat = {
              id: eventData.id,
              title: eventData.title,
              category: eventData.category,
              message: eventData.message,
              images: eventData.images,
              status: eventData.status,
              adminReply: eventData.adminReply,
              repliedAt: eventData.repliedAt || undefined,
              createdAt: eventData.createdAt,
              updatedAt: eventData.updatedAt,
            };
            // Send to user room (private event for the inquiry owner) with user format
            const userRoom = `${SocketRoom.USER}.${eventData.userId}`;
            this.server.to(userRoom).emit(SocketEvent.INQUIRY_REPLIED, userFormat);
            // Send to admin room (for all connected admins) with admin format
            this.server.to(SocketRoom.ADMIN).emit(SocketEvent.INQUIRY_REPLIED, data);
          } else {
            this.logger.error('inquiry:replied event missing userId', { data }, 'socket');
          }
        },
      );

      // Subscribe to scam-report:created (event for all admins)
      await this.redisService.subscribeToChannel(
        RedisChannel.SCAM_REPORT_CREATED,
        (data) => {
          this.server.to(SocketRoom.ADMIN).emit(SocketEvent.SCAM_REPORT_CREATED, data);
        },
      );

      // Subscribe to scam-report:updated (send to user room and admin room)
      await this.redisService.subscribeToChannel(
        RedisChannel.SCAM_REPORT_UPDATED,
        (data: unknown) => {
          const eventData = data as { userId?: string };
          if (eventData.userId) {
            const userRoom = `${SocketRoom.USER}.${eventData.userId}`;
            this.server.to(userRoom).emit(SocketEvent.SCAM_REPORT_UPDATED, data);
          }
          this.server.to(SocketRoom.ADMIN).emit(SocketEvent.SCAM_REPORT_UPDATED, data);
        },
      );

      // Subscribe to scam-report:approved (send to user room and admin room)
      await this.redisService.subscribeToChannel(
        RedisChannel.SCAM_REPORT_APPROVED,
        (data: unknown) => {
          const eventData = data as { userId?: string };
          if (eventData.userId) {
            const userRoom = `${SocketRoom.USER}.${eventData.userId}`;
            this.server.to(userRoom).emit(SocketEvent.SCAM_REPORT_APPROVED, data);
          }
          this.server.to(SocketRoom.ADMIN).emit(SocketEvent.SCAM_REPORT_APPROVED, data);
        },
      );

      // Subscribe to scam-report:rejected (send to user room and admin room)
      await this.redisService.subscribeToChannel(
        RedisChannel.SCAM_REPORT_REJECTED,
        (data: unknown) => {
          const eventData = data as { userId?: string };
          if (eventData.userId) {
            const userRoom = `${SocketRoom.USER}.${eventData.userId}`;
            this.server.to(userRoom).emit(SocketEvent.SCAM_REPORT_REJECTED, data);
          }
          this.server.to(SocketRoom.ADMIN).emit(SocketEvent.SCAM_REPORT_REJECTED, data);
        },
      );

      // Subscribe to exchange:approved (send to user room and admin room)
      await this.redisService.subscribeToChannel(
        RedisChannel.EXCHANGE_APPROVED,
        (data: unknown) => {
          const eventData = data as { userId?: string };
          if (eventData.userId) {
            const userRoom = `${SocketRoom.USER}.${eventData.userId}`;
            this.server.to(userRoom).emit(SocketEvent.EXCHANGE_APPROVED, data);
          }
          this.server.to(SocketRoom.ADMIN).emit(SocketEvent.EXCHANGE_APPROVED, data);
        },
      );

      // Subscribe to exchange:rejected (send to user room and admin room)
      await this.redisService.subscribeToChannel(
        RedisChannel.EXCHANGE_REJECTED,
        (data: unknown) => {
          const eventData = data as { userId?: string };
          if (eventData.userId) {
            const userRoom = `${SocketRoom.USER}.${eventData.userId}`;
            this.server.to(userRoom).emit(SocketEvent.EXCHANGE_REJECTED, data);
          }
          this.server.to(SocketRoom.ADMIN).emit(SocketEvent.EXCHANGE_REJECTED, data);
        },
      );

      // Subscribe to exchange:processing (send to user room and admin room)
      await this.redisService.subscribeToChannel(
        RedisChannel.EXCHANGE_PROCESSING,
        (data: unknown) => {
          const eventData = data as { userId?: string };
          if (eventData.userId) {
            const userRoom = `${SocketRoom.USER}.${eventData.userId}`;
            this.server.to(userRoom).emit(SocketEvent.EXCHANGE_PROCESSING, data);
          }
          this.server.to(SocketRoom.ADMIN).emit(SocketEvent.EXCHANGE_PROCESSING, data);
        },
      );

      // Subscribe to redemption:approved (send to user room and admin room)
      await this.redisService.subscribeToChannel(
        RedisChannel.REDEMPTION_APPROVED,
        (data: unknown) => {
          const eventData = data as { userId?: string };
          if (eventData.userId) {
            const userRoom = `${SocketRoom.USER}.${eventData.userId}`;
            this.server.to(userRoom).emit(SocketEvent.REDEMPTION_APPROVED, data);
          }
          this.server.to(SocketRoom.ADMIN).emit(SocketEvent.REDEMPTION_APPROVED, data);
        },
      );

      // Subscribe to redemption:rejected (send to user room and admin room)
      await this.redisService.subscribeToChannel(
        RedisChannel.REDEMPTION_REJECTED,
        (data: unknown) => {
          const eventData = data as { userId?: string };
          if (eventData.userId) {
            const userRoom = `${SocketRoom.USER}.${eventData.userId}`;
            this.server.to(userRoom).emit(SocketEvent.REDEMPTION_REJECTED, data);
          }
          this.server.to(SocketRoom.ADMIN).emit(SocketEvent.REDEMPTION_REJECTED, data);
        },
      );

      // Subscribe to exchange:requested (event for all admins)
      await this.redisService.subscribeToChannel(
        RedisChannel.EXCHANGE_REQUESTED,
        (data) => {
          this.server.to(SocketRoom.ADMIN).emit(SocketEvent.EXCHANGE_REQUESTED, data);
        },
      );

      // Subscribe to exchange:cancelled (event for all admins)
      await this.redisService.subscribeToChannel(
        RedisChannel.EXCHANGE_CANCELLED,
        (data) => {
          this.server.to(SocketRoom.ADMIN).emit(SocketEvent.EXCHANGE_CANCELLED, data);
        },
      );

      // Subscribe to redemption:created (event for all admins)
      await this.redisService.subscribeToChannel(
        RedisChannel.REDEMPTION_CREATED,
        (data) => {
          this.server.to(SocketRoom.ADMIN).emit(SocketEvent.REDEMPTION_CREATED, data);
        },
      );

      // Subscribe to redemption:cancelled (event for all admins)
      await this.redisService.subscribeToChannel(
        RedisChannel.REDEMPTION_CANCELLED,
        (data) => {
          this.server.to(SocketRoom.ADMIN).emit(SocketEvent.REDEMPTION_CANCELLED, data);
        },
      );

      // Subscribe to site-request:created (event for all admins)
      await this.redisService.subscribeToChannel(
        RedisChannel.SITE_REQUEST_CREATED,
        (data) => {
          this.server.to(SocketRoom.ADMIN).emit(SocketEvent.SITE_REQUEST_CREATED, data);
        },
      );

      // Subscribe to site-request:approved (send to user room and admin room)
      await this.redisService.subscribeToChannel(
        RedisChannel.SITE_REQUEST_APPROVED,
        (data: unknown) => {
          const eventData = data as { userId?: string };
          if (eventData.userId) {
            const userRoom = `${SocketRoom.USER}.${eventData.userId}`;
            this.server.to(userRoom).emit(SocketEvent.SITE_REQUEST_APPROVED, data);
          }
          this.server.to(SocketRoom.ADMIN).emit(SocketEvent.SITE_REQUEST_APPROVED, data);
        },
      );

      // Subscribe to site-request:rejected (send to user room and admin room)
      await this.redisService.subscribeToChannel(
        RedisChannel.SITE_REQUEST_REJECTED,
        (data: unknown) => {
          const eventData = data as { userId?: string };
          if (eventData.userId) {
            const userRoom = `${SocketRoom.USER}.${eventData.userId}`;
            this.server.to(userRoom).emit(SocketEvent.SITE_REQUEST_REJECTED, data);
          }
          this.server.to(SocketRoom.ADMIN).emit(SocketEvent.SITE_REQUEST_REJECTED, data);
        },
      );

      // Subscribe to site-request:cancelled (send to user room and admin room)
      await this.redisService.subscribeToChannel(
        RedisChannel.SITE_REQUEST_CANCELLED,
        (data: unknown) => {
          const eventData = data as { userId?: string };
          if (eventData.userId) {
            const userRoom = `${SocketRoom.USER}.${eventData.userId}`;
            this.server.to(userRoom).emit(SocketEvent.SITE_REQUEST_CANCELLED, data);
          }
          this.server.to(SocketRoom.ADMIN).emit(SocketEvent.SITE_REQUEST_CANCELLED, data);
        },
      );

      // Subscribe to site-badge-request:created (event for all admins)
      await this.redisService.subscribeToChannel(
        RedisChannel.SITE_BADGE_REQUEST_CREATED,
        (data) => {
          this.server.to(SocketRoom.ADMIN).emit(SocketEvent.SITE_BADGE_REQUEST_CREATED, data);
        },
      );

      // Subscribe to site-badge-request:approved (send to user room and admin room)
      await this.redisService.subscribeToChannel(
        RedisChannel.SITE_BADGE_REQUEST_APPROVED,
        (data: unknown) => {
          const eventData = data as { userId?: string };
          if (eventData.userId) {
            const userRoom = `${SocketRoom.USER}.${eventData.userId}`;
            this.server.to(userRoom).emit(SocketEvent.SITE_BADGE_REQUEST_APPROVED, data);
          }
          this.server.to(SocketRoom.ADMIN).emit(SocketEvent.SITE_BADGE_REQUEST_APPROVED, data);
        },
      );

      // Subscribe to site-badge-request:rejected (send to user room and admin room)
      await this.redisService.subscribeToChannel(
        RedisChannel.SITE_BADGE_REQUEST_REJECTED,
        (data: unknown) => {
          const eventData = data as { userId?: string };
          if (eventData.userId) {
            const userRoom = `${SocketRoom.USER}.${eventData.userId}`;
            this.server.to(userRoom).emit(SocketEvent.SITE_BADGE_REQUEST_REJECTED, data);
          }
          this.server.to(SocketRoom.ADMIN).emit(SocketEvent.SITE_BADGE_REQUEST_REJECTED, data);
        },
      );

      // Subscribe to site-badge-request:cancelled (event for all admins)
      await this.redisService.subscribeToChannel(
        RedisChannel.SITE_BADGE_REQUEST_CANCELLED,
        (data) => {
          this.server.to(SocketRoom.ADMIN).emit(SocketEvent.SITE_BADGE_REQUEST_CANCELLED, data);
        },
      );
    } catch (error) {
      this.logger.error(
        'Failed to setup Redis subscriptions',
        {
          error: error instanceof Error ? error.message : String(error),
        },
        'socket',
      );
    }
  }

  async handleConnection(client: AuthenticatedSocket) {
    // Join public room by default
    await client.join(SocketRoom.PUBLIC);

    // Send welcome message
    client.emit(SocketEvent.CONNECTED, {
      message: 'Connected to socket server',
      clientId: client.id,
      timestamp: new Date().toISOString(),
    });
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    // Clean up user room if authenticated
    if (client.data.userId) {
      await client.leave(`${SocketRoom.USER}.${client.data.userId}`);
    }
    // Clean up admin room if authenticated as admin
    if (client.data.isAdmin) {
      await client.leave(SocketRoom.ADMIN);
    }
  }

  @SubscribeMessage(SocketEvent.AUTH)
  async handleAuth(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { token: string },
  ) {
    const { token } = data;

    if (!token) {
      client.emit(SocketEvent.AUTH_ERROR, {
        message: 'Token is required',
      });
      return;
    }

    try {
      // Verify JWT token
      const payload = this.jwtService.verifyAccessToken(token);

      // Check if token is revoked
      const tokenRecord = await this.userTokenRepository.findByTokenId(payload.jti);
      if (!tokenRecord || !tokenRecord.isValid()) {
        client.emit(SocketEvent.AUTH_ERROR, {
          message: 'Token has been revoked or expired',
        });
        return;
      }

      // Store user info in socket
      client.data.userId = payload.sub;
      client.data.email = payload.email;

      // Join user-specific room for private events
      await client.join(`${SocketRoom.USER}.${payload.sub}`);

      client.emit(SocketEvent.AUTH_SUCCESS, {
        userId: payload.sub,
        email: payload.email,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        'Authentication error',
        {
          error: error instanceof Error ? error.message : String(error),
          clientId: client.id,
        },
        'socket',
      );
      client.emit(SocketEvent.AUTH_ERROR, {
        message: 'Invalid or expired token',
      });
    }
  }

  @SubscribeMessage(SocketEvent.JOIN_CHANNEL)
  async handleJoinChannel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channel: string },
  ) {
    const { channel } = data;

    try {
      await client.join(channel);
      client.emit(SocketEvent.JOINED_CHANNEL, {
        channel,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        'Error joining channel',
        {
          error: error instanceof Error ? error.message : String(error),
          clientId: client.id,
          channel,
        },
        'socket',
      );
      client.emit(SocketEvent.ERROR, { message: 'Failed to join channel' });
    }
  }

  @SubscribeMessage(SocketEvent.LEAVE_CHANNEL)
  async handleLeaveChannel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channel: string },
  ) {
    const { channel } = data;
    await client.leave(channel);
    client.emit(SocketEvent.LEFT_CHANNEL, {
      channel,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage(SocketEvent.ADMIN_AUTH)
  async handleAdminAuth(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { token: string },
  ) {
    const { token } = data;

    if (!token) {
      client.emit(SocketEvent.ADMIN_AUTH_ERROR, {
        message: 'Token is required',
      });
      return;
    }

    try {
      // Verify JWT token
      const payload = this.jwtService.verifyAccessToken(token);

      // Check if token is revoked (check admin token repository)
      const tokenRecord = await this.adminTokenRepository.findByTokenId(payload.jti);
      if (!tokenRecord || !tokenRecord.isValid()) {
        client.emit(SocketEvent.ADMIN_AUTH_ERROR, {
          message: 'Token has been revoked or expired',
        });
        return;
      }

      // Verify admin exists and is active
      const admin = await this.adminRepository.findById(payload.sub);
      if (!admin || !admin.isActive) {
        client.emit(SocketEvent.ADMIN_AUTH_ERROR, {
          message: 'Admin not found or inactive',
        });
        return;
      }

      // Store admin info in socket
      client.data.adminId = payload.sub;
      client.data.email = payload.email;
      client.data.isAdmin = true;

      // Join admin room for admin events
      await client.join(SocketRoom.ADMIN);

      client.emit(SocketEvent.ADMIN_AUTH_SUCCESS, {
        adminId: payload.sub,
        email: payload.email,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        'Admin authentication error',
        {
          error: error instanceof Error ? error.message : String(error),
          clientId: client.id,
        },
        'socket',
      );
      client.emit(SocketEvent.ADMIN_AUTH_ERROR, {
        message: 'Invalid or expired token',
      });
    }
  }

  // Public methods for broadcasting
  public broadcastToChannel(channel: string, event: string, data: any) {
    this.server.to(channel).emit(event, data);
  }

  public broadcastToUser(userId: string, event: string, data: any) {
    const userRoom = `${SocketRoom.USER}.${userId}`;
    this.server.to(userRoom).emit(event, data);
  }

  public broadcastToAll(event: string, data: any) {
    this.server.emit(event, data);
  }
}
