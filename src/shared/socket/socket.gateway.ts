import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

export enum SocketChannel {
  PUBLIC = 'public',
  PRIVATE = 'private',
  GAME_RESULTS = 'game-results',
  NOTIFICATIONS = 'notifications',
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/',
})
@Injectable()
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SocketGateway.name);

  constructor() {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    // Join public channel by default
    await client.join(SocketChannel.PUBLIC);

    // Send welcome message
    client.emit('connected', {
      message: 'Connected to socket server',
      clientId: client.id,
      timestamp: new Date().toISOString(),
    });
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-channel')
  async handleJoinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channel: string; token?: string },
  ) {
    const { channel, token } = data;

    try {
      // Validate channel
      if (!Object.values(SocketChannel).includes(channel as SocketChannel)) {
        client.emit('error', { message: 'Invalid channel' });
        return;
      }

      // For private channels, require authentication
      if (channel === SocketChannel.PRIVATE || channel === SocketChannel.NOTIFICATIONS) {
        if (!token) {
          client.emit('error', {
            message: 'Authentication required for private channel',
          });
          return;
        }

        // TODO: Implement JWT token validation
        // For now, return mock user
        const user = {
          id: 'user-123',
          username: 'test-user',
          email: 'test@example.com',
        };

        // Store user info in socket
        client.data.user = user;
      }

      await client.join(channel);
      client.emit('joined-channel', {
        channel,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Client ${client.id} joined channel ${channel}`);
    } catch (error) {
      this.logger.error(`Error joining channel: ${error.message}`);
      client.emit('error', { message: 'Failed to join channel' });
    }
  }

  @SubscribeMessage('leave-channel')
  async handleLeaveChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channel: string },
  ) {
    const { channel } = data;
    await client.leave(channel);
    client.emit('left-channel', {
      channel,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Client ${client.id} left channel ${channel}`);
  }

  // Public methods for broadcasting
  public broadcastToChannel(channel: string, event: string, data: any) {
    this.server.to(channel).emit(event, data);
  }

  public broadcastToUser(userId: string, event: string, data: any) {
    this.server.emit(event, { userId, ...data });
  }

  public broadcastToAll(event: string, data: any) {
    this.server.emit(event, data);
  }
}
