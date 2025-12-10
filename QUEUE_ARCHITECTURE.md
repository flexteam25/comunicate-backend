# Queue Architecture - Multi-Domain Queue System

## 📁 Directory Structure

```
src/
├── commands/
│   └── queue/
│       ├── queue-worker.command.ts    # Queue worker command
│       └── queue-worker.module.ts     # Queue worker module
├── shared/
│   └── queue/
│       ├── queue-worker.module.ts     # BullMQ worker configuration
│       ├── queue-client.module.ts     # BullMQ client configuration
│       ├── queue.service.ts           # Service to add jobs to queues
│       └── processors/
│           ├── test-queue.processor.ts      # Process socket events
│           └── notification.processor.ts   # Process notifications
├── domains/
│   ├── game/
│   │   └── commands/
│   │       └── socket-client.command.ts     # Socket client (add jobs)
│   └── user/
│       └── services/
│           └── user-notification.service.ts # User notification service
```

## 🚀 Usage

### 1. Run Queue Worker (process all jobs)

```bash
# Development
npm run queue-worker:dev

# Production
npm run queue-worker

# With custom concurrency
node dist/cli.js queue-worker --concurrency=4
```

### 2. Run Socket Client (add jobs)

```bash
# Development
npm run socket-client:dev

# Production  
npm run socket-client
```

### 3. Run Main App

```bash
# Development
npm run start:dev

# Production
npm run start
```

## 📊 Queue Types

### 1. **test-queue** - Socket Events
- **Processor**: `TestQueueProcessor`
- **Job Type**: `game_data`
- **Data**: Socket message data from game providers
- **Usage**: Process real-time socket events from NAMED_POWERBALL
- **Concurrency**: Default (no specific concurrency set)

### 2. **notification** - Notifications
- **Processor**: `NotificationProcessor`
- **Job Type**: `send-notification`
- **Data**: User notifications
- **Usage**: Push notifications, in-app notifications
- **Concurrency**: Default (no specific concurrency set)

## 🔧 Queue Service Methods

```typescript
// Socket events
await queueService.addTestQueueJob({
  provider: 'NAMED_POWERBALL',
  data: socketData,
  timestamp: Date.now(),
  messageType: 'game_data'
});

// Notifications
await queueService.addNotificationJob({
  userId: 'user123',
  type: 'welcome',
  message: 'Welcome!',
  data: { userName: 'John' }
});
```

## 🔄 How It Works - Detailed Flow

### 1. **Job Creation Flow**
```
┌─────────────────┐    Add Job    ┌─────────────────┐    Store    ┌─────────────────┐
│  Domain Service │ ────────────► │  Queue Service  │ ──────────► │  Redis Queue    │
│                 │               │                 │             │                 │
│ - Socket Client │               │ - addTestQueueJob│             │ - test-queue    │
│ - User Service  │               │ - addNotificationJob│          │ - notification  │
└─────────────────┘               └─────────────────┘             └─────────────────┘
```

### 2. **Job Processing Flow**
```
┌─────────────────┐    Poll Jobs   ┌─────────────────┐    Process   ┌─────────────────┐
│  Redis Queue    │ ────────────► │  Queue Worker   │ ───────────► │  Processors     │
│                 │               │                 │               │                 │
│ - test-queue    │               │ - BullMQ Worker │               │ - TestQueueProc │
│ - notification  │               │ - Concurrency   │               │ - NotificationProc│
└─────────────────┘               └─────────────────┘               └─────────────────┘
```

### 3. **Complete System Flow**
```
┌─────────────────┐    WebSocket    ┌─────────────────┐    Add Job    ┌─────────────────┐
│  External API  │ ──────────────► │  Socket Client  │ ────────────► │  Queue Service  │
│                 │                │                 │               │                 │
│ - Game Data    │                │ - Connect       │               │ - addTestQueueJob│
│ - Real-time    │                │ - Subscribe     │               │ - Redis Storage │
└─────────────────┘                └─────────────────┘               └─────────────────┘
                                                      │
                                                      ▼
┌─────────────────┐    Process     ┌─────────────────┐    Poll        ┌─────────────────┐
│  Processors     │ ◄───────────── │  Queue Worker  │ ◄───────────── │  Redis Queue    │
│                 │                │                 │                │                 │
│ - TestQueueProc│                │ - BullMQ Worker │                │ - test-queue    │
│ - NotificationProc│             │ - Concurrency  │                │ - notification  │
└─────────────────┘                └─────────────────┘                └─────────────────┘
```

## ⚡ Concurrency Configuration

### **Current Setup**
- **No Global Concurrency**: Processors use default BullMQ concurrency (1 job at a time)
- **Per-Processor Concurrency**: Can be configured individually in `@Processor` decorator
- **Redis Configuration**: Port 6329, Password protected, Database 2

### **How to Add Concurrency**

#### **Option 1: Per-Processor Concurrency**
```typescript
@Processor('test-queue', {
  concurrency: 5, // Process up to 5 jobs concurrently
})
export class TestQueueProcessor extends WorkerHost {
  // ...
}
```

#### **Option 2: Global Concurrency (Not Currently Implemented)**
```typescript
// In queue-worker.module.ts
BullModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    connection: redisConfig,
    defaultJobOptions: {
      concurrency: 3, // Global concurrency for all processors
    },
  }),
})
```

### **Current Architecture Benefits**
- ✅ **Simple**: No complex concurrency configuration
- ✅ **Reliable**: One job at a time prevents race conditions
- ✅ **Easy to Debug**: Sequential processing makes logs clear
- ✅ **Resource Efficient**: Lower memory usage

### **When to Add Concurrency**
- **High Volume**: When processing > 100 jobs/minute
- **I/O Bound**: When jobs spend time waiting for external APIs
- **Independent Jobs**: When jobs don't share resources

## 🛠️ How to Add New Queues

### **Step 1: Create Processor**
```typescript
// src/shared/queue/processors/payment.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';

export interface PaymentJobData {
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
}

@Processor('payment')
@Injectable()
export class PaymentProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentProcessor.name);

  async process(job: Job<PaymentJobData>): Promise<any> {
    const { userId, amount, currency, paymentMethod } = job.data;

    this.logger.log(`Processing payment: ${amount} ${currency} for user ${userId}`);

    // Process payment logic
    await this.processPayment(job.data);

    return { success: true, transactionId: 'tx_123' };
  }

  private async processPayment(data: PaymentJobData): Promise<void> {
    // Payment processing logic
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

### **Step 2: Update Queue Worker Module**
```typescript
// src/shared/queue/queue-worker.module.ts
import { PaymentProcessor } from './processors/payment.processor';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    BullModule.forRootAsync({
      // ... existing configuration
    }),
    BullModule.registerQueue(
      { name: 'test-queue' },
      { name: 'notification' },
      { name: 'payment' },  // Add new queue
    ),
  ],
  providers: [
    TestQueueProcessor, 
    NotificationProcessor, 
    PaymentProcessor,  // Add new processor
  ],
  exports: [BullModule, TestQueueProcessor, NotificationProcessor, PaymentProcessor],
})
export class QueueWorkerModule {}
```

### **Step 3: Update Queue Service**
```typescript
// src/shared/queue/queue.service.ts
export interface PaymentJobData {
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
}

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('test-queue') private testQueue: Queue<TestQueueJobData>,
    @InjectQueue('notification') private notificationQueue: Queue<NotificationJobData>,
    @InjectQueue('payment') private paymentQueue: Queue<PaymentJobData>,  // Add new queue
  ) {}

  // Add new method
  async addPaymentJob(data: PaymentJobData): Promise<void> {
    await this.paymentQueue.add('process-payment', data, {
      removeOnComplete: 100,
      removeOnFail: 20,
    });
  }
}
```

### **Step 4: Use in Domain Service**
```typescript
// src/domains/payment/services/payment.service.ts
@Injectable()
export class PaymentService {
  constructor(private readonly queueService: QueueService) {}

  async processPayment(paymentData: PaymentDto): Promise<void> {
    // Add payment job to queue
    await this.queueService.addPaymentJob({
      userId: paymentData.userId,
      amount: paymentData.amount,
      currency: paymentData.currency,
      paymentMethod: paymentData.method,
    });
  }
}
```

## 🎯 Benefits of New Architecture

### ✅ **Clear Separation**
- Queue worker in `commands/queue/` - processes for all domains
- Processors in `shared/queue/processors/` - shared processing logic
- Domain services in `domains/*/services/` - domain-specific business logic

### ✅ **Scalable**
- Easy to add new processors for different domains
- Concurrency can be adjusted per environment
- PM2 manages processes independently

### ✅ **Maintainable**
- Each processor handles one specific job type
- Queue service provides unified interface
- Easy to test and debug

## 🚀 PM2 Management

```bash
# Start all processes
npm run pm2:start:dev

# Start specific processes
pm2 start minigame-api
pm2 start socket-client
pm2 start queue-worker

# Monitor
pm2 monit
pm2 logs
```

## 🔧 Configuration

### Environment Variables
```env
REDIS_HOST=localhost
REDIS_PORT=6329
REDIS_PASSWORD=redispass123
```

### Queue Settings
- **test-queue**: removeOnComplete=10, removeOnFail=5
- **notification**: removeOnComplete=10, removeOnFail=5
- **Redis**: Port 6329, Password protected, Database 2

### Current Configuration
- **Queue Worker**: Processes jobs from Redis
- **Socket Client**: Adds jobs to test-queue
- **Logging**: Separate log files for each component
- **Concurrency**: Default (1 job at a time per processor)
