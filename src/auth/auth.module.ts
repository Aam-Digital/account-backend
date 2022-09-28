import { Module } from '@nestjs/common';
import { BearerStrategy } from './bearer/bearer.strategy';
import { HttpModule } from '@nestjs/axios';
import { AdminAuthService } from './admin/admin-auth/admin-auth.service';

@Module({
  imports: [HttpModule],
  providers: [BearerStrategy, AdminAuthService],
})
export class AuthModule {}
