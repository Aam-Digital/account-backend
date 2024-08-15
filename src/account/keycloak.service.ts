import { Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { KeycloakUser } from './keycloak-user.dto';
import { catchError, map, Observable, of } from 'rxjs';

/**
 * This service provides endpoints for interacting with Keycloak.
 */
@Injectable()
export class KeycloakService {
  // These roles are created by Keycloak automatically and should not be added or removed from users.
  private static readonly KEYCLOAK_DEFAULT_ROLES = [
    'default-roles',
    'offline_access',
    'uma_authorization',
  ];

  private readonly keycloakUrl: string;

  constructor(private http: HttpService, configService: ConfigService) {
    this.keycloakUrl = configService.get('KEYCLOAK_URL');
  }

  /**
   * Create a user in the realm with the given name and email
   * @param realm
   * @param username
   * @param email
   */
  createUser(realm: string, username: string, email: string) {
    return this.perform(
      this.http.post,
      `${realm}/users`,
      new KeycloakUser(username, email),
    );
  }

  /**
   * Delete a user in the realm with the given id
   * @param realm
   * @param id
   */
  deleteUser(realm: string, id: string) {
    return this.perform(
      this.http.delete,
      `${realm}/users/${id}`,
      {}
    ).pipe(
      catchError(() => {
        return of("")
      }),
    );
  }

  /**
   * Update the user with the given id in the realm.
   * @param realm
   * @param userId
   * @param user see {@link https://www.keycloak.org/docs-api/19.0.2/rest-api/index.html#_userrepresentation}
   */
  updateUser(realm: string, userId: string, user: Partial<KeycloakUser>) {
    return this.perform(this.http.put, `${realm}/users/${userId}`, user);
  }

  /**
   * Looks for a single user that matches the criteria in params.
   * The user is only returned if only a single user is matching the criteria exactly.
   * If none or more than one user are matching throws a `NotFoundException`
   * @param realm
   * @param params see {@link https://www.keycloak.org/docs-api/19.0.2/rest-api/index.html#_getusers}
   */
  findUserBy(realm: string, params: { [key in string]: string | boolean }) {
    params.exact = true;
    return this.findUsersBy(realm, params).pipe(
      map((res) => {
        if (res.length !== 1) {
          throw new NotFoundException(`Could not find user`);
        } else {
          return res[0];
        }
      }),
    );
  }

  /**
   * Allows to find users by the given criteria.
   * The keys in the `params` object have to be valid Keycloak user properties.
   * Users where all values are matching are returned.
   * @param realm
   * @param params
   */
  findUsersBy(realm: string, params: { [key in string]: string | boolean }) {
    return this.perform<KeycloakUser[]>(this.http.get, `${realm}/users`, {
      params,
    });
  }

  /**
   * Sends an email to the user with the given id, asking to perform the specified action.
   * @param realm
   * @param client
   * @param userId
   * @param action e.g. "UPDATE_PASSWORD", "VERIFY_EMAIL"
   * @param lang
   */
  sendEmail(
    realm: string,
    client: string,
    userId: string,
    action: string,
    lang?: string,
  ) {
    return this.perform(
      this.http.put,
      `${realm}/users/${userId}/execute-actions-email?client_id=${client}&redirect_uri=`,
      [action],
      { headers: { 'Accept-Language': lang } },
    );
  }

  /**
   * Get all available roles in this realm
   * @param realm
   */
  getAllRoles(realm: string) {
    return this.perform<{ name: string }[]>(
      this.http.get,
      `${realm}/roles`,
    ).pipe(map((roles) => this.filterNonTechnicalRoles(roles)));
  }

  private filterNonTechnicalRoles(roles: { name: string }[]) {
    return roles.filter(
      (role) => !KeycloakService.KEYCLOAK_DEFAULT_ROLES.includes(role.name),
    );
  }

  /**
   * Returns all roles associated with a user
   * @param realm
   * @param userId
   */
  getRolesOfUser(realm: string, userId: string) {
    return this.perform<{ name: string }[]>(
      this.http.get,
      `${realm}/users/${userId}/role-mappings/realm`,
    ).pipe(map((roles) => this.filterNonTechnicalRoles(roles)));
  }

  /**
   * Assigns a list of roles to a user.
   * @param realm
   * @param userId
   * @param roles should be objects equal to the ones provided by `getRoles()`
   */
  assignRoles(realm: string, userId: string, roles: any[]) {
    const appRoles = this.filterNonTechnicalRoles(roles);
    return this.perform(
      this.http.post,
      `${realm}/users/${userId}/role-mappings/realm`,
      appRoles,
    );
  }

  /**
   * Delete a list of roles from a user.
   * @param realm
   * @param userId
   * @param roles should be objects equal to the ones provided by `getRoles()`
   */
  deleteRoles(realm: string, userId: string, roles: any[]) {
    const appRoles = this.filterNonTechnicalRoles(roles);
    return this.perform(
      this.http.delete,
      `${realm}/users/${userId}/role-mappings/realm`,
      { data: appRoles },
    );
  }

  /**
   * Simple helper function that automatically prepends the keycloak url
   * and maps the Axios result to the actual data object.
   * @param func e.g. `this.http.get`
   * @param args of the function provided
   * @private
   */
  private perform<
    R,
    A extends (...args) => Observable<{ data: R }> = (
      ...args
    ) => Observable<{ data: R }>,
  >(func: A, ...args: Parameters<typeof func>): Observable<R> {
    const url = `${this.keycloakUrl}/admin/realms/${args[0]}`;
    return func
      .call(this.http, url, ...args.slice(1))
      .pipe(map((res: any) => res.data));
  }
}
