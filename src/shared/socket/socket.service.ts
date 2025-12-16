import { Injectable, Logger } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';

@Injectable()
export class SocketService {
  private readonly logger = new Logger(SocketService.name);

  constructor(
    private readonly socketGateway: SocketGateway,
  ) {}

  public broadcastToChannel(channel: string, event: string, data: any): void {
    // Check if socket gateway is available (might be null in queue worker context)
    if (!this.socketGateway || !this.socketGateway.server) {
      return;
    }
    
    this.socketGateway.broadcastToChannel(channel, event, data);
  }

  public broadcastToUser(userId: string, event: string, data: any): void {
    if (!this.socketGateway || !this.socketGateway.server) {
      return;
    }
    
    this.socketGateway.broadcastToUser(userId, event, data);
  }

  public broadcastToAll(event: string, data: any): void {
    if (!this.socketGateway || !this.socketGateway.server) {
      return;
    }
    
    this.socketGateway.broadcastToAll(event, data);
  }

  public async validateToken(token: string): Promise<any> {
    // TODO: Implement JWT token validation
    // For now, return mock user
    return {
      id: 'user-123',
      username: 'test-user',
      email: 'test@example.com',
    };
  }

  public async removeClient(clientId: string): Promise<void> {
    this.logger.log(`Removed client: ${clientId}`);
  }
}
