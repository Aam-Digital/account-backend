import { ApiProperty } from '@nestjs/swagger';

/**
 * Request object for setting/updating the email address of a user.
 */
export class SetEmailReq {
  @ApiProperty({
    description: 'email which should be set for the user',
    example: 'my@email.com',
  })
  email: string;
}
