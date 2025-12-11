import { Command, CommandRunner } from 'nest-commander';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../shared/logger/logger.service';

@Command({
  name: 'queue-worker',
  description: 'Queue Worker - Process jobs from BullMQ queues',
})
@Injectable()
export class QueueWorkerCommand extends CommandRunner implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  async onModuleInit() {
    this.logger.info('Queue Worker started and listening for jobs...', null, 'queue-worker');
  }

  async run(): Promise<void> {
    this.setupSignalHandlers();
    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  private resolve?: (value: void) => void;
  private isShuttingDown: boolean = false;

  private setupSignalHandlers(): void {
    // Remove existing handlers first
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGUSR1');
    process.removeAllListeners('SIGUSR2');

    // Add new handlers
    process.on('SIGINT', this.handleShutdown.bind(this));
    process.on('SIGTERM', this.handleShutdown.bind(this));
    process.on('SIGUSR1', this.handleShutdown.bind(this));
    process.on('SIGUSR2', this.handleShutdown.bind(this));
  }

  private handleShutdown(): void {
    if (this.isShuttingDown) {
      return;
    }
    this.isShuttingDown = true;

    // Resolve the promise to allow graceful exit
    if (this.resolve) {
      this.resolve();
    }
  }
}
