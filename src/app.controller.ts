import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { BearerGuard } from './auth/bearer.guard';

@Controller()
export class AppController {
  @UseGuards(BearerGuard)
  @Get()
  getHello(@Req() request): string {
    return request.user;
  }
}
