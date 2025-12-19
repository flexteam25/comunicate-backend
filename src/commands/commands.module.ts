import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CqrsModule } from "@nestjs/cqrs";
import { QueueClientModule } from "../shared/queue/queue-client.module";

@Module({
  imports: [
    ConfigModule,
    CqrsModule,
    // GameModule,
    QueueClientModule, // Only for adding jobs (socket-client)
  ],
  providers: [],
})
export class CommandsModule {}
