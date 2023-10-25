/**
 * Class, which mirrors the Keycloak UserRepresentation.
 * see {@link https://www.keycloak.org/docs-api/19.0.2/rest-api/index.html#_userrepresentation}
 */
import { ApiProperty } from '@nestjs/swagger';

export class KeycloakUser {
  @ApiProperty({ description: 'Unique identifier of a user' })
  id?: string;

  @ApiProperty({ description: 'Unique name of the user' })
  username?: string;

  @ApiProperty({ description: 'Email of the user' })
  email?: string;

  @ApiProperty({ description: 'Other optional attributes of a user' })
  attributes?: { [key in string]: string };

  @ApiProperty({
    description:
      'Actions the user need to perform on the account. E.g. "VERIFY_EMAIL", or "UPDATE_PASSWORD"',
  })
  requiredActions?: string[];

  @ApiProperty({ description: 'Whether the user account is enabled' })
  enabled? = true;

  @ApiProperty({
    description: 'A list of credentials with which the user can log in',
  })
  credentials?: { [key in string]: any }[];

  @ApiProperty({ description: 'Roles associated with a user' })
  roles?: any[];

  constructor(username: string, email: string) {
    this.username = username;
    this.email = email;
    this.attributes = { exact_username: username };
    this.requiredActions = ['VERIFY_EMAIL', 'UPDATE_PASSWORD'];
    this.credentials = [];
  }
}
