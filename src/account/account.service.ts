import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { KeycloakUser } from './keycloak-user';
import { forkJoin, map, Observable } from 'rxjs';

@Injectable()
export class AccountService {
  private readonly keycloakUrl: string;
  constructor(private http: HttpService, configService: ConfigService) {
    this.keycloakUrl = configService.get('KEYCLOAK_URL');
  }

  createUser(realm: string, username: string, email: string) {
    return this.keycloakRequest(
      this.http.post,
      `/${realm}/users`,
      new KeycloakUser(username, email),
    );
  }

  updateUser(realm: string, userId: string, user: Partial<KeycloakUser>) {
    return this.keycloakRequest(
      this.http.put,
      `${realm}/users/${userId}`,
      user,
    );
  }

  findUserBy(realm: string, params: { [key in string]: string }) {
    return this.keycloakRequest<{ id: string; email: string }[]>(
      this.http.get,
      `/${realm}/users`,
      { params },
    );
  }

  sendEmail(realm: string, client: string, userId: string, action: string) {
    return this.keycloakRequest(
      this.http.put,
      `${realm}/users/${userId}/execute-actions-email?client_id=${client}&redirect_uri=`,
      [action],
    );
  }

  getRoles(realm: string, roles: string[]) {
    return forkJoin(
      roles.map((role) =>
        this.keycloakRequest(this.http.get, `${realm}/roles/${role}`),
      ),
    );
  }

  assignRoles(realm: string, userId: string, roles: any[]) {
    return this.keycloakRequest(
      this.http.post,
      `${realm}/users/${userId}/role-mappings/realm`,
      roles,
    );
  }

  private keycloakRequest<
    R,
    A extends (...args) => Observable<{ data: R }> = (
      ...args
    ) => Observable<{ data: R }>,
  >(func: A, ...args: Parameters<typeof func>): Observable<R> {
    const url = `${this.keycloakUrl}/admin/realms/${args[0]}`;
    return func(url, ...args.slice(1)).pipe(map((res) => res.data));
  }
}
