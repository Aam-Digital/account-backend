import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { HttpModule } from '@nestjs/axios';
import { AccountModule } from './account/account.module';

@Module({
  imports: [AuthModule, AuthModule, HttpModule, AccountModule],
  controllers: [AppController],
})
export class AppModule {}
