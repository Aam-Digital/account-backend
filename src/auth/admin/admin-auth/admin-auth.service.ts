import { Injectable, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, map, Observable } from 'rxjs';
import { OIDCTokenResponse } from '../oidc-token-response.dto';
import { ConfigService } from '@nestjs/config';

/**
 * This service authenticates against the Keycloak admin-cli.
 * This is required in order to use the Keycloak Admin API {@link https://www.keycloak.org/docs-api/19.0.1/rest-api/index.html}.
 */
@Injectable()
export class AdminAuthService {
  private readonly keycloakUrl: string;
  accessToken: string;
  refreshToken: string;
  refreshTokenTimeout;

  constructor(private http: HttpService, configService: ConfigService) {
    this.keycloakUrl = configService.get('KEYCLOAK_URL');
    const username = configService.get('KEYCLOAK_ADMIN');
    const password = configService.get('KEYCLOAK_PASSWORD');
    this.login(username, password).subscribe(() =>
      console.log(`${username} logged in`),
    );
  }

  /**
   * Login the admin with the given credentials.
   * After successful login, the session is kept alive using refresh tokens.
   * @param username of admin
   * @param password of admin
   * @returns OIDCTokenResponse
   */
  login(username: string, password: string): Observable<OIDCTokenResponse> {
    return this.credentialAuth(username, password);
  }

  private credentialAuth(username: string, password: string) {
    const body = new URLSearchParams();
    body.set('username', username);
    body.set('password', password);
    body.set('grant_type', 'password');
    return this.getToken(body);
  }

  private refreshTokenAuth() {
    const body = new URLSearchParams();
    body.set('refresh_token', this.refreshToken);
    body.set('grant_type', 'refresh_token');
    return this.getToken(body);
  }

  private getToken(body: URLSearchParams): Observable<OIDCTokenResponse> {
    body.set('client_id', 'admin-cli');
    const obs = this.http
      .post<OIDCTokenResponse>(
        `${this.keycloakUrl}/realms/master/protocol/openid-connect/token`,
        body.toString(),
      )
      .pipe(
        map((res) => res.data),
        catchError(() => {
          throw new UnauthorizedException();
        }),
      );
    obs.subscribe({
      next: (res) => {
        this.accessToken = res.access_token;
        this.refreshToken = res.refresh_token;
        this.http.axiosRef.defaults.headers.common['Authorization'] =
          'Bearer ' + this.accessToken;
        this.refreshTokenBeforeExpiry(res.expires_in);
      },
      error: () => undefined,
    });
    return obs;
  }

  private refreshTokenBeforeExpiry(secondsTillExpiration: number) {
    // Refresh token one minute before it expires or after ten seconds
    const refreshTimeout = Math.max(50, secondsTillExpiration - 60);
    clearTimeout(this.refreshTokenTimeout);
    this.refreshTokenTimeout = setTimeout(
      () => this.refreshTokenAuth(),
      refreshTimeout * 1000,
    );
  }
}
