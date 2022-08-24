import { Module } from '@nestjs/common';
import { AccountController } from './account/account.controller';

@Module({
  controllers: [AccountController],
})
export class AccountModule {}
