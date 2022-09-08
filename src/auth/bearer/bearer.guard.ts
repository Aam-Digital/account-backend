import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * This guard can be used in controllers to only allow requests with a valid Keycloak Bearer token.
 * When used, the user object will be stored in `request.user` see {@link User}.
 */
@Injectable()
export class BearerGuard extends AuthGuard('bearer') {}
