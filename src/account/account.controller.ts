import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { BearerGuard } from '../auth/bearer/bearer.guard';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { concatMap, map, tap, throwError } from 'rxjs';
import { ForgotEmailReq } from './forgot-email-req.dto';
import { SetEmailReq } from './set-email-req.dto';
import { User } from '../auth/user.dto';
import { NewAccount } from './new-account.dto';
import { KeycloakService } from './keycloak.service';
import { prepareResult } from '../utils/utils';

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

  constructor(private keycloak: KeycloakService) {}

  @ApiOperation({
    summary: 'create a new account',
    description: `Creates a new account with the provided username and email.
      The roles need to match the format of the '/roles' endpoint
      A email is sent to the provided address to verify the account and set a password.
    `,
  })
  @ApiBearerAuth()
  @UseGuards(BearerGuard)
  @Post()
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
    return this.keycloak.createUser(realm, username, email).pipe(
      concatMap(() => this.keycloak.findUsersBy(realm, { username })),
      tap((res) => (userId = res[0].id)),
      concatMap(() =>
        this.keycloak.sendEmail(realm, client, userId, 'VERIFY_EMAIL'),
      ),
      // TODO test empty array
      concatMap(() => this.keycloak.assignRoles(user.realm, userId, roles)),
      prepareResult(),
    );
  }

  @ApiOperation({
    summary: 'set email of a user',
    description: `Set or update the email of a registered user. 
      The email is updated for the user associated with the Bearer token. 
      This sends a verification email.
    `,
  })
  @UseGuards(BearerGuard)
  @ApiBearerAuth()
  @Put('set-email')
  setEmail(@Req() req, @Body() { email }: SetEmailReq) {
    const user = req.user as User;
    // TODO email is directly marked as verified
    return this.keycloak
      .updateUser(user.realm, user.sub, {
        email: email,
        requiredActions: ['VERIFY_EMAIL'],
      })
      .pipe(
        concatMap(() =>
          this.keycloak.sendEmail(
            user.realm,
            user.client,
            user.sub,
            'VERIFY_EMAIL',
          ),
        ),
        prepareResult(),
      );
  }

  @ApiOperation({
    summary: 'send password reset email',
    description:
      'Looks for the user with the given email and sends a reset password email',
  })
  @Post('forgot-password')
  forgotPassword(@Body() { email, realm, client }: ForgotEmailReq) {
    return this.keycloak.findUsersBy(realm, { email }).pipe(
      map((users) => {
        // TODO only verified/valid accounts should allow a password reset?
        if (users.length !== 1 || users[0].email !== email) {
          throw new BadRequestException(
            `Could not find user with email: ${email}`,
          );
        }
        return users[0];
      }),
      concatMap((user) =>
        this.keycloak.sendEmail(realm, client, user.id, 'UPDATE_PASSWORD'),
      ),
      prepareResult(),
    );
  }

  @ApiOperation({
    summary: 'get all roles',
    description: 'Returns all available roles in this realm',
  })
  @ApiBearerAuth()
  @UseGuards(BearerGuard)
  @Get('/roles')
  getRoles(@Req() req) {
    const user = req.user as User;
    return this.keycloak.getAllRoles(user.realm);
  }
}
