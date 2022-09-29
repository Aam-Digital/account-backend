/**
 * Class, which mirrors the Keycloak UserRepresentation.
 * see {@link https://www.keycloak.org/docs-api/19.0.2/rest-api/index.html#_userrepresentation}
 */
export class KeycloakUser {
  /**
   * Unique identifier of a user.
   */
  id?: string;
  /**
   * Other optional attributes of a user.
   */
  attributes: { [key in string]: string };
  /**
   * Actions the user need to perform on the account.
   * E.g. "VERIFY_EMAIL", or "RESET_PASSWORD"
   */
  requiredActions: string[];
  /**
   * Whether the user account is enabled.
   */
  enabled = true;
  /**
   * A list of credentials with which the user can log in.
   */
  credentials: { [key in string]: any }[];

  constructor(public username: string, public email: string) {
    this.attributes = { exact_username: username };
    this.requiredActions = ['VERIFY_EMAIL'];
    this.credentials = [
      {
        type: 'password',
        value: 'tmpPass',
        // this triggers the set new password flow
        temporary: true,
      },
    ];
  }
}
