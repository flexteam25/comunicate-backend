import { Queue } from 'bullmq';
import * as dotenv from 'dotenv';

dotenv.config();

type Mode = 'job' | 'all-failed';

function getArgValue(args: string[], key: string): string | undefined {
  const found = args.find((a) => a.startsWith(`${key}=`));
  return found ? found.split('=')[1] : undefined;
}

// npm run queue:retry -- --queue=game-point-log --job=1
// npm run queue:retry -- --queue=game-point-log --all-failed
// "--" means after that, arguments are for the script, not for the command

async function main() {
  const args = process.argv.slice(2);

  const queueName = getArgValue(args, '--queue') || 'game-point-log';
  const jobId = getArgValue(args, '--job');
  const allFailed = args.includes('--all-failed');

  let mode: Mode | null = null;
  if (jobId) {
    mode = 'job';
  } else if (allFailed) {
    mode = 'all-failed';
  }

  if (!mode) {
    console.error(
      'Usage:\n' +
        '  ts-node -r tsconfig-paths/register scripts/retry-queue.ts --queue=game-point-log --job=123\n' +
        '  ts-node -r tsconfig-paths/register scripts/retry-queue.ts --queue=game-point-log --all-failed',
    );
    process.exit(1);
  }

  const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  };

  const queue = new Queue(queueName, { connection });

  try {
    if (mode === 'job' && jobId) {
      const job = await queue.getJob(jobId);
      if (!job) {
        console.error(`Job ${jobId} not found in queue "${queueName}".`);
        process.exit(1);
      }

      const state = await job.getState();
      console.log(`Job ${job.id} current state: ${state}`);

      if (state !== 'failed') {
        console.error('Job is not in failed state, cannot retry.');
        process.exit(1);
      }

      await job.retry();
      console.log(`Retried job ${job.id} in queue "${queueName}".`);
    } else if (mode === 'all-failed') {
      const failed = await queue.getFailed();
      console.log(`Found ${failed.length} failed job(s) in queue "${queueName}".`);

      for (const job of failed) {
        console.log(`Retrying job ${job.id}...`);
        await job.retry();
      }

      console.log('Done retrying all failed jobs.');
    }
  } finally {
    await queue.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
