import { SetMetadata } from '@nestjs/common';

/**
 * This marks an endpoint to require certain roles in order to be used.
 * Should be used together with the `RolesGuard` {@link RolesGuard}.
 * @param roles which are required to use the endpoint
 * @constructor
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
