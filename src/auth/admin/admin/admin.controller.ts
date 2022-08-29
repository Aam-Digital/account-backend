import { Body, Controller, Post } from '@nestjs/common';
import { AdminAuthService } from '../admin-auth/admin-auth.service';
import { Login } from './login.dto';

@Controller('admin')
export class AdminController {
  constructor(private adminAuth: AdminAuthService) {}

  @Post('login')
  authenticate(@Body() body: Login) {
    return this.adminAuth.login(body.username, body.password);
  }
}
