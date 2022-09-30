import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from '../user.dto';

/**
 * This guard matches the user roles with the ones in the `@roles` decorated.
 * If the user is missing any of the roles, an exception is thrown.
 *
 * e.g.
 * ```javascript
 * @UseGuards(BearerGuard, RolesGuard)
 * @Roles('my-role')
 * @Get('/protected')
 * getProtectedResource() {...}
 * ```
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user as User;
    return roles.every((role) => user['_couchdb.roles'].includes(role));
  }
}
