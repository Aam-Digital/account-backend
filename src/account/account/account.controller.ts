import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BearerGuard } from '../../auth/bearer/bearer.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { firstValueFrom, map } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ForgotEmailReq } from './forgot-email-req.dto';
import { SetEmailReq } from './set-email-req.dto';
import { User } from '../../auth/user.dto';

/**
 * API for things related to user accounts in Keycloak.
 */
@Controller('account')
export class AccountController {
  constructor(private http: HttpService) {}

  /**
   * Set/update the email of a user.
   * This will send a verification email to the user
   * @param req
   * @param email the email which should be set
   */
  @UseGuards(BearerGuard)
  @ApiBearerAuth()
  @Put('set-email')
  async setEmail(@Req() req, @Body() { email }: SetEmailReq) {
    const user = req.user as User;
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
    return { ok: true };
  }

  /**
   * Looks for the user with the given email and send a reset password email.
   * @param email of a user
   * @param realm in which the user is registered
   * @param client through which the user authenticates
   */
  @Post('forgot-password')
  async forgotPassword(@Body() { email, realm, client }: ForgotEmailReq) {
    const usersUrl = `https://keycloak.aam-digital.com/admin/realms/${realm}/users`;
    const getUserUrl = `${usersUrl}?q=email:${email}`;
    const usersWithEmail = await firstValueFrom(
      this.http.get<any[]>(getUserUrl).pipe(map((res) => res.data)),
    );
    // TODO only verified/valid accounts should allow a password reset?
    if (usersWithEmail.length !== 1 || usersWithEmail[0].email !== email) {
      throw new BadRequestException(`Could not find user with email: ${email}`);
    }
    const user = usersWithEmail[0];
    const resetPasswordUrl = `${usersUrl}/${user.id}/execute-actions-email?client_id=${client}&redirect_uri=`;
    await firstValueFrom(this.http.put(resetPasswordUrl, ['UPDATE_PASSWORD']));
    return { ok: true };
  }
}
