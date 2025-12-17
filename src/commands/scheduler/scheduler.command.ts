import { Command, CommandRunner } from "nest-commander";
import { Injectable, OnModuleInit } from "@nestjs/common";
import { LoggerService } from "../../shared/logger/logger.service";

@Command({
  name: "scheduler",
  description: "Scheduler - Start cron scheduler for scheduled jobs",
})
@Injectable()
export class SchedulerCommand extends CommandRunner implements OnModuleInit {
  private isShuttingDown: boolean = false;
  private resolve?: (value: void) => void;

  constructor(private readonly logger: LoggerService) {
    super();
  }

  async onModuleInit() {
    this.logger.info(
      "Scheduler started - Cron scheduler is active",
      null,
      "scheduler"
    );

    this.setupSignalHandlers();
  }

  async run(): Promise<void> {
    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  private setupSignalHandlers(): void {
    // Remove existing handlers first
    process.removeAllListeners("SIGINT");
    process.removeAllListeners("SIGTERM");
    process.removeAllListeners("SIGUSR1");
    process.removeAllListeners("SIGUSR2");

    // Add new handlers
    process.on("SIGINT", this.handleShutdown.bind(this));
    process.on("SIGTERM", this.handleShutdown.bind(this));
    process.on("SIGUSR1", this.handleShutdown.bind(this));
    process.on("SIGUSR2", this.handleShutdown.bind(this));
  }

  private handleShutdown(): void {
    if (this.isShuttingDown) {
      return;
    }
    this.isShuttingDown = true;

    this.logger.info("Shutting down scheduler...", null, "scheduler");

    // Resolve the promise to allow graceful exit
    if (this.resolve) {
      this.resolve();
    }
  }
}
