import { HttpStatus, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { concatMap, lastValueFrom, map, Observable, tap } from 'rxjs';
import { OIDCTokenResponse } from '../oidc-token-response.dto';
import { ConfigService } from '@nestjs/config';

/**
 * This service authenticates against the Keycloak admin-cli.
 * This is required in order to use the Keycloak Admin API {@link https://www.keycloak.org/docs-api/19.0.1/rest-api/index.html}.
 */
@Injectable()
export class AdminAuthService {
  private readonly keycloakUrl: string;

  constructor(private http: HttpService, configService: ConfigService) {
    this.keycloakUrl = configService.get('KEYCLOAK_URL');
    const username = configService.get('KEYCLOAK_ADMIN');
    const password = configService.get('KEYCLOAK_PASSWORD');
    this.http.axiosRef.interceptors.response.use(
      (res) => res,
      (err) => {
        // intercept requests where the admin token might have timed out
        if (
          err.response.status !== HttpStatus.UNAUTHORIZED ||
          err.config.url.match(/openid-connect/)
        ) {
          // these errors should just be returned
          throw err;
        }
        // receive new access_token and retry request
        delete err.config.headers.Authorization;
        return lastValueFrom(
          this.login(username, password).pipe(
            concatMap(() => this.http.request(err.config)),
          ),
        );
      },
    );
  }

  /**
   * Login the admin with the given credentials.
   * The received access_token is set as a default header for all outgoing http requests.
   * @param username of admin
   * @param password of admin
   * @returns OIDCTokenResponse
   */
  login(username: string, password: string): Observable<OIDCTokenResponse> {
    const body = new URLSearchParams();
    body.set('username', username);
    body.set('password', password);
    body.set('grant_type', 'password');
    body.set('client_id', 'admin-cli');
    return this.http
      .post<OIDCTokenResponse>(
        `${this.keycloakUrl}/realms/master/protocol/openid-connect/token`,
        body.toString(),
      )
      .pipe(
        map((res) => res.data),
        tap(({ access_token }) => {
          this.http.axiosRef.defaults.headers.common['Authorization'] =
            'Bearer ' + access_token;
        }),
      );
  }
}
