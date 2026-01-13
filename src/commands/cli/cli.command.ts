import { Command, CommandRunner, Option } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { ICommand } from './base-command.interface';
import { SyncUserPostsCommand } from './commands/sync-user-posts.command';
import { SyncUserCommentsCommand } from './commands/sync-user-comments.command';
import { AttendanceStatisticsCommand } from './commands/attendance-statistics.command';

interface CliCommandOptions {
  userId?: string;
}

/**
 * Main CLI command that routes to sub-commands
 * Similar to Laravel's artisan command
 */
@Command({
  name: 'cli',
  description: 'CLI commands for various tasks',
  subCommands: [],
})
@Injectable()
export class CliCommand extends CommandRunner {
  private commands: Map<string, ICommand> = new Map();

  constructor(
    private readonly syncUserPostsCommand: SyncUserPostsCommand,
    private readonly syncUserCommentsCommand: SyncUserCommentsCommand,
    private readonly attendanceStatisticsCommand: AttendanceStatisticsCommand,
  ) {
    super();
    this.registerCommands();
  }

  private registerCommands(): void {
    // Register all available commands
    this.commands.set('sync-user-posts', this.syncUserPostsCommand);
    this.commands.set('sync-user-comments', this.syncUserCommentsCommand);
    this.commands.set('attendance-statistics', this.attendanceStatisticsCommand);
  }

  async run(passedParams: string[], options?: CliCommandOptions): Promise<void> {
    const commandName = passedParams[0];

    if (!commandName) {
      this.showHelp();
      process.exit(1);
    }

    const command = this.commands.get(commandName);

    if (!command) {
      console.error(`❌ Error: Unknown command: ${commandName}`);
      this.showHelp();
      process.exit(1);
    }

    // Extract remaining args (skip command name)
    const args = passedParams.slice(1);

    // Merge options with args for commands that need it
    const commandOptions: Record<string, any> = {
      ...options,
    };

    // If userId is provided as option, pass it to command
    if (options?.userId) {
      commandOptions.userId = options.userId;
    }

    await command.handle(args, commandOptions);
  }

  @Option({
    flags: '-u, --userId <userId>',
    description: 'User ID (for commands that require it)',
  })
  parseUserId(val: string): string {
    return val;
  }

  private showHelp(): void {
    console.log('\nUsage:');
    console.log('  npm run cli:dev -- <command> [options]');
    console.log('  npm run cli -- <command> [options]');
    console.log('\nAvailable commands:');

    // Automatically list all registered commands
    const commandEntries = Array.from(this.commands.entries()).sort();
    for (const [signature, command] of commandEntries) {
      console.log(`\n  ${signature}`);
      console.log(`    ${command.description}`);
    }

    console.log('\nExamples:');
    console.log('  npm run cli:dev -- sync-user-posts --userId=xxx');
    console.log('  npm run cli:dev -- sync-user-comments --userId=xxx');
    console.log('  npm run cli:dev -- attendance-statistics');
  }
}
