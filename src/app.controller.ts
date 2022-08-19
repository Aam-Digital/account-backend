import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { BearerGuard } from './auth/bearer/bearer.guard';
import { Login } from './login.dto';
import { AdminAuthService } from './auth/admin/admin-auth/admin-auth.service';

@Controller()
export class AppController {
  constructor(private adminAuth: AdminAuthService) {}

  @UseGuards(BearerGuard)
  @Get()
  getHello(@Req() request): string {
    return request.user;
  }

  @Post()
  authenticate(@Body() body: Login) {
    return this.adminAuth.login(body.username, body.password);
  }
}
