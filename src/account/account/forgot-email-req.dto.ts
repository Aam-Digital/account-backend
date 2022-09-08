/**
 * Request object for sending a passwort reset email for the user with the matching email address.
 */
export class ForgotEmailReq {
  /**
   * The email under which a user is registered.
   */
  email: string;
  /**
   * The realm in which the user is registered.
   */
  realm: string;
  /**
   * The client through which the user should authenticate.
   */
  client: string;
}
