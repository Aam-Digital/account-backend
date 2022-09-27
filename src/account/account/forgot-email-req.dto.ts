import { ApiProperty } from '@nestjs/swagger';

/**
 * Request object for sending a passwort reset email for the user with the matching email address.
 */
export class ForgotEmailReq {
  @ApiProperty({
    description:
      'email of a registered user to which password reset email should be sent',
    example: 'my@email.com',
  })
  email: string;

  @ApiProperty({
    description: 'realm in which the user is registered',
    example: 'my-realm',
  })
  realm: string;

  @ApiProperty({
    description: 'client through which the user authenticates',
    example: 'my-client',
  })
  client: string;
}
