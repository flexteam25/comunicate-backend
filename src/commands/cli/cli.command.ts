import { Command, CommandRunner, Option } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { ICommand } from './base-command.interface';
import { SyncUserPostsCommand } from './commands/sync-user-posts.command';
import { SyncUserCommentsCommand } from './commands/sync-user-comments.command';
import { BackfillGameDailyStatsCommand } from './commands/backfill-game-daily-stats.command';

interface CliCommandOptions {
  userId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
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
    private readonly backfillGameDailyStatsCommand: BackfillGameDailyStatsCommand,
  ) {
    super();
    this.registerCommands();
  }

  private registerCommands(): void {
    // Register all available commands
    this.commands.set('sync-user-posts', this.syncUserPostsCommand);
    this.commands.set('sync-user-comments', this.syncUserCommentsCommand);
    this.commands.set('backfill-game-daily-stats', this.backfillGameDailyStatsCommand);
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

  @Option({
    flags: '--date <date>',
    description: 'UTC date (YYYY-MM-DD) for backfill-game-daily-stats',
  })
  parseDate(val: string): string {
    return val;
  }

  @Option({
    flags: '--startDate <startDate>',
    description: 'UTC start date (YYYY-MM-DD) for backfill-game-daily-stats',
  })
  parseStartDate(val: string): string {
    return val;
  }

  @Option({
    flags: '--endDate <endDate>',
    description: 'UTC end date (YYYY-MM-DD) for backfill-game-daily-stats',
  })
  parseEndDate(val: string): string {
    return val;
  }

  private showHelp(): void {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    CLI Commands Help                         ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    console.log('Usage:');
    console.log('  npm run cli:dev -- <command> [options]');
    console.log('  npm run cli -- <command> [options]\n');

    console.log('Available commands:');
    console.log('─────────────────────────────────────────────────────────────');

    // Automatically list all registered commands
    const commandEntries = Array.from(this.commands.entries()).sort();
    if (commandEntries.length === 0) {
      console.log('  No commands available.\n');
    } else {
      for (const [signature, command] of commandEntries) {
        console.log(`\n  ${signature}`);
        console.log(`    ${command.description}`);
      }
      console.log('');
    }

    console.log('Examples:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log('  npm run cli:dev -- sync-user-posts --userId=xxx');
    console.log('  npm run cli:dev -- sync-user-comments --userId=xxx');
    console.log('  npm run cli:dev -- backfill-game-daily-stats --date=2026-02-27');
    console.log(
      '  npm run cli:dev -- backfill-game-daily-stats --startDate=2026-02-01 --endDate=2026-02-07',
    );
    console.log('');
  }
}
