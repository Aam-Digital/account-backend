import {
  BadRequestException,
  Body,
  Controller,
  HttpException,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { BearerGuard } from '../../auth/bearer/bearer.guard';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  catchError,
  concatMap,
  firstValueFrom,
  forkJoin,
  map,
  tap,
  throwError,
} from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ForgotEmailReq } from './forgot-email-req.dto';
import { SetEmailReq } from './set-email-req.dto';
import { User } from '../../auth/user.dto';
import { ConfigService } from '@nestjs/config';
import { NewAccount } from './new-account.dto';
import { KeycloakUser } from './keycloak-user';

/**
 * Endpoints to perform user account related tasks.
 * These use the Keycloak Admin API {@link https://www.keycloak.org/docs-api/19.0.1/rest-api/index.html}.
 * The documentation can be found on the swagger UI at `/api`
 */
@Controller('account')
export class AccountController {
  /**
   * Role that is required to create a new user.
   * TODO add role to default realm setup or integrate with CASL rules
   */
  static readonly ACCOUNT_MANAGEMENT_ROLE = 'account_manager';

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
  createAccount(@Req() req, @Body() { username, email, roles }: NewAccount) {
    const user = req.user as User;
    if (
      !user['_couchdb.roles'].includes(
        AccountController.ACCOUNT_MANAGEMENT_ROLE,
      )
    ) {
      return throwError(() => new UnauthorizedException('missing permissions'));
    }
    // create user
    const newUser = new KeycloakUser(username, email);
    const baseUrl = `${this.keycloakUrl}/admin/realms/${user.realm}`;
    let userId: string;
    // create user
    return this.http.post(`${baseUrl}/users`, newUser).pipe(
      // send verification email
      concatMap(() => this.http.get(`${baseUrl}/users?username=${username}`)),
      tap((res) => (userId = res.data[0].id)),
      concatMap(() =>
        this.http.put(
          `${baseUrl}/users/${userId}/execute-actions-email?client_id=${user.client}&redirect_uri=`,
          ['VERIFY_EMAIL'],
        ),
      ),
      // assign roles
      concatMap(() =>
        forkJoin(
          roles.map((role) => this.http.get(`${baseUrl}/roles/${role}`)),
        ),
      ),
      concatMap((res) =>
        this.http.post(
          `${baseUrl}/users/${userId}/role-mappings/realm`,
          res.map((r) => r.data),
        ),
      ),
      catchError((err) => {
        throw new HttpException(
          err.response.data.errorMessage,
          err.response.status,
        );
      }),
      map(() => ({ ok: true })),
    );
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
