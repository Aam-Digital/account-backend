import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BearerGuard } from '../auth/bearer/bearer.guard';
import { ApiBearerAuth, ApiHeader, ApiOperation } from '@nestjs/swagger';
import {
  catchError,
  concatMap,
  concatWith,
  firstValueFrom,
  last,
  Observable,
  of,
  switchMap,
  tap
} from "rxjs";
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
  @ApiHeader({ name: 'Accept-Language', required: false })
  @UseGuards(BearerGuard, RolesGuard)
  @Roles(AccountController.ACCOUNT_MANAGEMENT_ROLE)
  @Post()
  createAccount(
    @Req() req,
    @Body() { username, email, roles }: NewAccount,
    @Headers('Accept-Language') lang?: string,
  ) {
    const user = req.user as User;
    const { realm, client } = user;
    let userId: string;
    return this.keycloak.createUser(realm, username, email).pipe(
      concatMap(() => this.keycloak.findUserBy(realm, { username })),
      tap((res) => (userId = res.id)),
      concatMap(() =>
        this.keycloak.sendEmail(realm, client, userId, 'VERIFY_EMAIL', lang),
      ),
      concatMap(() => this.keycloak.assignRoles(user.realm, userId, roles)),
      prepareResult(),
    );
  }

  @ApiOperation({
    summary: 'delete an user account',
    description:
      'Looks if an account with given id exist in realm and deletes it',
  })
  @ApiBearerAuth()
  @ApiHeader({ name: 'Accept-Language', required: false })
  @UseGuards(BearerGuard, RolesGuard)
  @Roles(AccountController.ACCOUNT_MANAGEMENT_ROLE)
  @Delete('/:userId')
  deleteAccount(
    @Req() req,
    @Param('userId') userId: string,
  ) {
    const user = req.user as User;

    return this.keycloak.deleteUser(
      user.realm,
      userId
    ).pipe(
      switchMap(() => {
        return of({
          userDeleted: true
        });
      }),
      catchError(() => {
        return of({
          userDeleted: false
        });
      }),
    )
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
      this.keycloak.findUserBy(user.realm, {
        q: `exact_username:${username}`,
      }),
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
  @ApiHeader({ name: 'Accept-Language', required: false })
  @UseGuards(BearerGuard, RolesGuard)
  @Roles(AccountController.ACCOUNT_MANAGEMENT_ROLE)
  @Put('/:userId')
  updateAccount(
    @Req() req,
    @Param('userId') userId: string,
    @Body() updatedUser: KeycloakUser,
    @Headers('Accept-Language') lang?: string,
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
        this.keycloak.sendEmail(realm, client, userId, 'VERIFY_EMAIL', lang),
      );
    }
    // first update the user object, then run other observables
    return this.keycloak
      .updateUser(realm, userId, updatedUser)
      .pipe(concatWith(...observables), last(), prepareResult());
  }
}
