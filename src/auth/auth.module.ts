import { Module } from '@nestjs/common';
import { BearerStrategy } from './bearer.strategy';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [BearerStrategy],
})
export class AuthModule {}
