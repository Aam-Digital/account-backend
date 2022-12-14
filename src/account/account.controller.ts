import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BearerGuard } from '../auth/bearer/bearer.guard';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  concatMap,
  concatWith,
  firstValueFrom,
  last,
  Observable,
  tap,
} from 'rxjs';
import { ForgotEmailReq } from './forgot-email-req.dto';
import { SetEmailReq } from './set-email-req.dto';
import { User } from '../auth/user.dto';
import { NewAccount } from './new-account.dto';
import { KeycloakService } from './keycloak.service';
import { prepareResult } from '../utils/utils';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles';
import { KeycloakUser } from './keycloak-user.dto';

/**
 * Endpoints to perform user account related tasks.
 * These use the Keycloak Admin API {@link https://www.keycloak.org/docs-api/19.0.1/rest-api/index.html}.
 * The documentation can be found on the swagger UI at `/api`
 */
@Controller('account')
export class AccountController {
  /**
   * Role that is required to create a new user.
   */
  static readonly ACCOUNT_MANAGEMENT_ROLE = 'account_manager';

  constructor(private keycloak: KeycloakService) {}

  @ApiOperation({
    summary: 'set email of user',
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
    return this.keycloak.findUserBy(realm, { email }).pipe(
      // TODO only verified/valid accounts should allow a password reset?
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

  @ApiOperation({
    summary: 'create a new account',
    description: `Creates a new account with the provided username and email.
      The roles need to match the format of the '/roles' endpoint
      A email is sent to the provided address to verify the account and set a password.
    `,
  })
  @ApiBearerAuth()
  @UseGuards(BearerGuard, RolesGuard)
  @Roles(AccountController.ACCOUNT_MANAGEMENT_ROLE)
  @Post()
  createAccount(@Req() req, @Body() { username, email, roles }: NewAccount) {
    const user = req.user as User;
    const { realm, client } = user;
    let userId: string;
    return this.keycloak.createUser(realm, username, email).pipe(
      concatMap(() => this.keycloak.findUserBy(realm, { username })),
      tap((res) => (userId = res.id)),
      concatMap(() =>
        this.keycloak.sendEmail(realm, client, userId, 'VERIFY_EMAIL'),
      ),
      concatMap(() => this.keycloak.assignRoles(user.realm, userId, roles)),
      prepareResult(),
    );
  }

  @ApiOperation({
    summary: 'get account details',
    description:
      'Returns the user with the given username and the assigned roles.',
  })
  @ApiBearerAuth()
  @UseGuards(BearerGuard, RolesGuard)
  @Roles(AccountController.ACCOUNT_MANAGEMENT_ROLE)
  @Get('/:username')
  async getAccount(
    @Req() req,
    @Param('username') username: string,
  ): Promise<KeycloakUser> {
    const user = req.user as User;
    const account = await firstValueFrom(
      this.keycloak.findUserBy(user.realm, { username }),
    );
    const roles = await firstValueFrom(
      this.keycloak.getRolesOfUser(user.realm, account.id),
    );
    return Object.assign(account, { roles });
  }

  @ApiOperation({
    summary: 'update account details',
    description: 'Partially update properties of a user.',
  })
  @ApiBearerAuth()
  @UseGuards(BearerGuard, RolesGuard)
  @Roles(AccountController.ACCOUNT_MANAGEMENT_ROLE)
  @Put('/:userId')
  updateAccount(
    @Req() req,
    @Param('userId') userId: string,
    @Body() updatedUser: KeycloakUser,
  ) {
    const { realm, client } = req.user as User;
    const observables: Observable<any>[] = [];
    if (updatedUser.roles) {
      const newRoles = updatedUser.roles;
      delete updatedUser.roles;
      // delete existing roles and assign new ones
      observables.push(
        this.keycloak.getRolesOfUser(realm, userId).pipe(
          concatMap((roles) => this.keycloak.deleteRoles(realm, userId, roles)),
          concatMap(() => this.keycloak.assignRoles(realm, userId, newRoles)),
        ),
      );
    }
    if (updatedUser.email) {
      // send verification email if email changed
      updatedUser.requiredActions = ['VERIFY_EMAIL'];
      observables.push(
        this.keycloak.sendEmail(realm, client, userId, 'VERIFY_EMAIL'),
      );
    }
    // first update the user object, then run other observables
    return this.keycloak
      .updateUser(realm, userId, updatedUser)
      .pipe(concatWith(...observables), last(), prepareResult());
  }
}
