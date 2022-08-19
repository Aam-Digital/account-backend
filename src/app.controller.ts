import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { BearerGuard } from './auth/bearer/bearer.guard';
import { Login } from './login.dto';
import { AdminAuthService } from './auth/admin/admin-auth/admin-auth.service';
import { HttpService } from '@nestjs/axios';
import { map } from 'rxjs';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller()
export class AppController {
  constructor(private adminAuth: AdminAuthService, private http: HttpService) {}

  @UseGuards(BearerGuard)
  @ApiBearerAuth()
  @Get('secured')
  getHello(@Req() request): string {
    return request.user;
  }

  @Post('admin/login')
  authenticate(@Body() body: Login) {
    return this.adminAuth.login(body.username, body.password);
  }

  @Get('test')
  test() {
    return this.http
      .get(
        'https://keycloak.aam-digital.com/realms/master/protocol/openid-connect/userinfo',
      )
      .pipe(map((res) => res.data));
  }
}
