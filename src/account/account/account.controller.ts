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
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { firstValueFrom, map } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ForgotEmailReq } from './forgot-email-req.dto';
import { SetEmailReq } from './set-email-req.dto';
import { User } from '../../auth/user.dto';
import { ConfigService } from '@nestjs/config';
import { NewAccount } from './new-account.dto';

/**
 * Endpoints to perform user account related tasks.
 * These use the Keycloak Admin API {@link https://www.keycloak.org/docs-api/19.0.1/rest-api/index.html}.
 * The documentation can be found on the swagger UI at `/api`
 */
@Controller('account')
export class AccountController {
  private readonly keycloakUrl: string;
  constructor(private http: HttpService, configService: ConfigService) {
    this.keycloakUrl = configService.get('KEYCLOAK_URL');
  }

  @ApiOperation({
    summary: 'create a new account',
    description: `Creates a new account with the provided username and email.
      The default role 'user_app' is assigned to the user.
      A email is sent to the provided address to verify the account and set a password.
    `,
  })
  @ApiBearerAuth()
  @UseGuards(BearerGuard)
  @Put()
  async createAccount(
    @Req() { user }: { user: User },
    @Body() { username, email }: NewAccount,
  ) {
    // create user
    const newUser = {
      username,
      attributes: { exact_username: username },
      email,
      requiredActions: ['VERIFY_EMAIL'],
      enabled: true,
      credentials: [
        {
          type: 'password',
          value: 'tmpPass',
          // this triggers the set new password flow
          temporary: true,
        },
      ],
    };
    const baseUrl = `${this.keycloakUrl}/admin/realms/${user.realm}/users`;
    await firstValueFrom(this.http.post(`${baseUrl}/users`, newUser));

    // send account verification email
    const keycloakUser = await firstValueFrom(
      this.http
        .get(`${baseUrl}/users?username=${username}`)
        .pipe(map((res) => res.data[0])),
    );
    await firstValueFrom(
      this.http.put(
        `${baseUrl}/users/${keycloakUser.id}/execute-actions-email?client_id=${user.client}&redirect_uri=`,
        ['VERIFY_EMAIL'],
      ),
    );

    // assign default `user_app` role
    const role = await firstValueFrom(
      this.http.get(`${baseUrl}/roles/user_app`).pipe(map((res) => res.data)),
    );
    await firstValueFrom(
      this.http.post(
        `${baseUrl}/users/${keycloakUser.id}/role-mappings/realm`,
        [role],
      ),
    );
    return { ok: true };
  }

  @ApiOperation({
    summary: 'Set email of a user',
    description: `Set or update the email of a registered user. 
      The email is updated for the user associated with the Bearer token. 
      This sends a verification email.
    `,
  })
  @UseGuards(BearerGuard)
  @ApiBearerAuth()
  @Put('set-email')
  async setEmail(@Req() req, @Body() { email }: SetEmailReq) {
    const user = req.user as User;
    const url = `${this.keycloakUrl}/admin/realms/${user.realm}/users/${user.sub}`;
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

  @ApiOperation({
    summary: 'Send password reset email',
    description:
      'Looks for the user with the given email and sends a reset password email',
  })
  @Post('forgot-password')
  async forgotPassword(@Body() { email, realm, client }: ForgotEmailReq) {
    const usersUrl = `${this.keycloakUrl}/admin/realms/${realm}/users`;
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
