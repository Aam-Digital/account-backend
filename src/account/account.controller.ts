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
import { BearerGuard } from '../auth/bearer/bearer.guard';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  catchError,
  concatMap,
  firstValueFrom,
  map,
  tap,
  throwError,
} from 'rxjs';
import { ForgotEmailReq } from './forgot-email-req.dto';
import { SetEmailReq } from './set-email-req.dto';
import { User } from '../auth/user.dto';
import { NewAccount } from './new-account.dto';
import { AccountService } from './account.service';

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

  constructor(private accounts: AccountService) {}

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
    const { realm, client } = user;
    if (
      !user['_couchdb.roles'].includes(
        AccountController.ACCOUNT_MANAGEMENT_ROLE,
      )
    ) {
      return throwError(() => new UnauthorizedException('missing permissions'));
    }
    let userId: string;
    // create user
    return this.accounts.createUser(realm, username, email).pipe(
      concatMap(() => this.accounts.findUserBy(realm, { username })),
      tap((res) => (userId = res[0].id)),
      concatMap(() =>
        this.accounts.sendEmail(realm, client, userId, 'VERIFY_EMAIL'),
      ),
      concatMap(() => this.accounts.getRoles(user.realm, roles)),
      concatMap((res) => this.accounts.assignRoles(user.realm, userId, res)),
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
    await firstValueFrom(
      this.accounts.updateUser(user.realm, user.sub, {
        email: email,
        requiredActions: ['VERIFY_EMAIL'],
      }),
    );
    await firstValueFrom(
      this.accounts.sendEmail(
        user.realm,
        user.client,
        user.sub,
        'VERIFY_EMAIL',
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
    const usersWithEmail = await firstValueFrom(
      this.accounts.findUserBy(realm, { email }),
    );
    // TODO only verified/valid accounts should allow a password reset?
    if (usersWithEmail.length !== 1 || usersWithEmail[0].email !== email) {
      throw new BadRequestException(`Could not find user with email: ${email}`);
    }
    const user = usersWithEmail[0];
    await firstValueFrom(
      this.accounts.sendEmail(realm, client, user.id, 'UPDATE_PASSWORD'),
    );
    return { ok: true };
  }
}
