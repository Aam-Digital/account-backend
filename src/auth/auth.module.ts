import { Module } from '@nestjs/common';
import { BearerStrategy } from './bearer/bearer.strategy';
import { HttpModule } from '@nestjs/axios';
import { AdminAuthService } from './admin/admin-auth/admin-auth.service';
import { AdminController } from './admin/admin/admin.controller';

@Module({
  imports: [HttpModule],
  providers: [BearerStrategy, AdminAuthService],
  controllers: [AdminController],
})
export class AuthModule {}
