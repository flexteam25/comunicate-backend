# CLI Commands Module

CLI commands module similar to Laravel's artisan commands.

## Structure

```
commands/cli/
├── base-command.interface.ts    # Base interface for all commands
├── cli.command.ts                # Main CLI router command
├── cli.module.ts                 # NestJS module
├── commands/                      # Individual command classes
│   ├── index.ts                  # Commands registry
│   ├── sync-user-posts.command.ts
│   └── attendance-statistics.command.ts
└── README.md                      # This file
```

## Usage

```bash
# Development
npm run cli:dev -- <command> [options]

# Production
npm run cli -- <command> [options]
```

## Available Commands

### sync-user-posts
Sync user_posts table for a specific user.

```bash
npm run cli:dev -- sync-user-posts --userId=<user-id>
```

### attendance-statistics
Trigger attendance statistics calculation job.

```bash
npm run cli:dev -- attendance-statistics
```

## Adding New Commands

1. Create a new command class in `commands/` directory:

```typescript
// commands/my-command.command.ts
import { Injectable } from '@nestjs/common';
import { ICommand } from '../base-command.interface';

@Injectable()
export class MyCommand implements ICommand {
  signature = 'my-command';
  description = 'Description of my command';

  async handle(args: string[], options?: Record<string, any>): Promise<void> {
    // Your command logic here
    console.log('My command executed!');
  }
}
```

2. Register the command in `cli.command.ts`:

```typescript
// In cli.command.ts constructor
constructor(
  // ... existing commands
  private readonly myCommand: MyCommand,
) {
  super();
  this.registerCommands();
}

private registerCommands(): void {
  // ... existing registrations
  this.commands.set('my-command', this.myCommand);
}
```

3. Add the command to `cli.module.ts` providers:

```typescript
// In cli.module.ts
providers: [
  CliCommand,
  // ... existing commands
  MyCommand,
],
```

4. Export in `commands/index.ts` (optional, for better organization):

```typescript
export { MyCommand } from './my-command.command';
```

## Command Interface

All commands must implement `ICommand` interface:

```typescript
interface ICommand {
  signature: string;        // Command name
  description: string;      // Command description
  handle(args, options): Promise<void>;  // Command execution logic
}
```

## Options

Commands can accept options via `--option=value` syntax. Options are parsed and passed to the command's `handle` method in the `options` parameter.

Example:
```bash
npm run cli:dev -- sync-user-posts --userId=123
```

In the command:
```typescript
async handle(args: string[], options?: Record<string, any>): Promise<void> {
  const userId = options?.userId; // '123'
}
```

