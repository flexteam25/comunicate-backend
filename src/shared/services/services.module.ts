import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordService } from './password.service';
import { JwtService } from './jwt.service';
import { TransactionService } from './transaction.service';

@Global()
@Module({
  imports: [TypeOrmModule],
  providers: [PasswordService, JwtService, TransactionService],
  exports: [PasswordService, JwtService, TransactionService],
})
export class ServicesModule {}
