import { Body, Controller, Put, Req, UseGuards } from '@nestjs/common';
import { BearerGuard } from '../../auth/bearer/bearer.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { User } from './user.dto';

@UseGuards(BearerGuard)
@ApiBearerAuth()
@Controller('account')
export class AccountController {
  constructor(private http: HttpService) {}
  @Put('set-email')
  async setEmail(@Req() req, @Body() { email }: User) {
    const user = req.user;
    const url = `https://keycloak.aam-digital.com/admin/realms/${user.realm}/users/${user.sub}`;
    await firstValueFrom(
      this.http.put(url, { email: email, requiredActions: ['VERIFY_EMAIL'] }),
    );
    await firstValueFrom(
      this.http.put(
        `${url}/execute-actions-email?client_id=${user.client}&redirect_uri=`,
        ['VERIFY_EMAIL'],
      ),
    );
    return 'success';
  }
}
