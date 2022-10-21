/**
 * This class represents the information and tokens sent by the `/token` endpoint of Keycloak.
 */
export class OIDCTokenResponse {
  /**
   * The actual access token which provides access.
   */
  access_token: string;
}
