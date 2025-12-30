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
import { LoggerService } from '../logger/logger.service';

interface AuthenticatedSocket extends Socket {
  data: {
    userId?: string;
    email?: string;
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

  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    @Inject('IUserTokenRepository')
    private readonly userTokenRepository: IUserTokenRepository,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit() {
    // Wait for Redis to be ready, then setup subscriptions
    // Retry up to 10 times with 500ms delay
    let retries = 0;
    const maxRetries = 10;

    while (retries < maxRetries) {
      if (this.redisService.isClientReady()) {
        await this.setupRedisSubscriptions();
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
  }

  afterInit() {
    this.logger.info('Socket Gateway initialized successfully', {}, 'socket');
  }

  private async setupRedisSubscriptions() {
    try {
      // Subscribe to site:created (public event)
      await this.redisService.subscribeToChannel(RedisChannel.SITE_CREATED, (data) => {
        this.server.to(SocketRoom.PUBLIC).emit(SocketEvent.SITE_CREATED, data);
      });

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

      this.logger.info('Redis subscriptions setup completed', {}, 'socket');
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
