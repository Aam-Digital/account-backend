import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [AuthModule, AuthModule, HttpModule],
  controllers: [AppController],
})
export class AppModule {}
