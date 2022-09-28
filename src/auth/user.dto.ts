/**
 * This class represents the user object that is created by the `BearerGuard`.
 * In a function that is annotated with this guard, the user can be accessed with `request.user`.
 */
export class User {
  /**
   * The ID of the user.
   */
  sub: string;
  /**
   * The realm in which the user is registered.
   */
  realm: string;
  /**
   * The name of the client through which the user is authenticated.
   */
  client: string;
}
