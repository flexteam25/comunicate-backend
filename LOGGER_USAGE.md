# Logger Usage Guide

## 🎯 Overview

The `LoggerService` is a clean, unified logging solution that writes to files with channel support.

## 📝 Basic Usage

### **Import and Inject**
```typescript
import { LoggerService } from '../shared/logger/logger.service';

@Injectable()
export class YourService {
  constructor(private readonly logger: LoggerService) {}
}
```

### **Logging Methods**
```typescript
// Basic logging
this.logger.info('User logged in successfully');
this.logger.warn('Rate limit approaching');
this.logger.error('Database connection failed');
this.logger.debug('Processing request data');

// With data
this.logger.info('User action completed', {
  userId: '123',
  action: 'login',
  timestamp: new Date()
});

// With channel (creates separate log file)
this.logger.info('Game result processed', data, 'game-results');
this.logger.warn('Payment failed', error, 'payments');
this.logger.error('API error', error, 'api-errors');
```

## 📁 Channel System

### **How Channels Work**
- **No channel**: Logs to `logs/app.log`
- **With channel**: Logs to `logs/{channel}.log`

### **Examples**
```typescript
// Logs to logs/app.log
this.logger.info('General application log');

// Logs to logs/game-results.log
this.logger.info('Game result processed', data, 'game-results');

// Logs to logs/payments.log
this.logger.warn('Payment failed', error, 'payments');

// Logs to logs/api-errors.log
this.logger.error('API error', error, 'api-errors');
```

## 🔧 Log Format

### **JSON Structure**
```json
{
  "timestamp": "2025-10-08T22:20:00.000Z",
  "level": "info",
  "message": "User logged in successfully",
  "data": {
    "userId": "123",
    "action": "login"
  },
  "channel": "app"
}
```

## 📊 File Organization

```
logs/
├── app.log                 # General application logs
├── game-results.log        # Game result processing
├── payments.log           # Payment processing
├── api-errors.log         # API error logs
├── test-queue.log         # Queue processing logs
└── notification.log       # Notification logs
```

## 🚀 Real Examples

### **In Queue Processors**
```typescript
@Processor('test-queue')
export class TestQueueProcessor extends WorkerHost {
  constructor(private readonly logger: LoggerService) {
    super();
  }

  async process(job: Job<TestQueueJobData>): Promise<any> {
    this.logger.info(`Processing job: ${job.data.messageType}`, {
      provider: job.data.provider,
      jobId: job.id
    }, 'test-queue');

    // Process job...
    
    this.logger.info('Job completed successfully', {
      jobId: job.id,
      duration: Date.now() - startTime
    }, 'test-queue');
  }
}
```

### **In Services**
```typescript
@Injectable()
export class GameService {
  constructor(private readonly logger: LoggerService) {}

  async processGameResult(result: GameResult): Promise<void> {
    this.logger.info('Processing game result', {
      gameId: result.gameId,
      provider: result.provider
    }, 'game-results');

    try {
      // Process result...
      this.logger.info('Game result processed successfully', {
        gameId: result.gameId
      }, 'game-results');
    } catch (error) {
      this.logger.error('Failed to process game result', {
        gameId: result.gameId,
        error: error.message
      }, 'game-results');
    }
  }
}
```

### **In Controllers**
```typescript
@Controller('api')
export class ApiController {
  constructor(private readonly logger: LoggerService) {}

  @Post('payment')
  async processPayment(@Body() payment: PaymentDto): Promise<void> {
    this.logger.info('Payment request received', {
      amount: payment.amount,
      currency: payment.currency
    }, 'payments');

    try {
      // Process payment...
      this.logger.info('Payment processed successfully', {
        transactionId: 'tx_123'
      }, 'payments');
    } catch (error) {
      this.logger.error('Payment failed', {
        error: error.message,
        amount: payment.amount
      }, 'payments');
    }
  }
}
```

## 🎯 Benefits

- ✅ **Simple API** - Just `info()`, `warn()`, `error()`, `debug()`
- ✅ **Channel Support** - Separate log files by feature
- ✅ **JSON Format** - Structured, parseable logs
- ✅ **No Console Output** - File-only logging
- ✅ **Global Module** - Available everywhere
- ✅ **Clean Architecture** - No complex configuration

## 🔧 Module Setup

### **Import LoggerModule**
```typescript
import { LoggerModule } from './shared/logger/logger.module';

@Module({
  imports: [LoggerModule],
  // ... other imports
})
export class YourModule {}
```

### **Global Usage**
Since `LoggerModule` is marked as `@Global()`, you can inject `LoggerService` anywhere without importing the module in every file.

## 📝 Best Practices

1. **Use descriptive channels** - `game-results`, `payments`, `api-errors`
2. **Include relevant data** - User IDs, transaction IDs, error details
3. **Use appropriate levels** - `info` for normal flow, `warn` for issues, `error` for failures
4. **Keep messages clear** - Describe what happened, not just what you're doing
5. **Use channels consistently** - Same feature = same channel

## 🎉 That's It!

The LoggerService is now ready to use throughout your application with clean, organized logging!
