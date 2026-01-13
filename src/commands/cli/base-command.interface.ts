/**
 * Base interface for CLI commands
 * Similar to Laravel's Command interface
 */
export interface ICommand {
  /**
   * Command signature (e.g., 'sync-user-posts')
   */
  signature: string;

  /**
   * Command description
   */
  description: string;

  /**
   * Execute the command
   * @param args Command arguments
   * @param options Command options
   */
  handle(args: string[], options?: Record<string, any>): Promise<void>;
}
