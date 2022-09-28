/**
 * This class represents the information and tokens sent by the `/token` endpoint of Keycloak.
 */
export class OIDCTokenResponse {
  /**
   * The actual access token which provides access.
   */
  access_token: string;
  /**
   * The time until the access token expires.
   */
  expires_in: number;
  /**
   * A token that can be used to retrieve a new access token.
   */
  refresh_token: string;
}
