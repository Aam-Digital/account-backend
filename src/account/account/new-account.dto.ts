import { ApiProperty } from '@nestjs/swagger';

export class NewAccount {
  @ApiProperty({ description: 'username for the new account' })
  username: string;
  @ApiProperty({
    description:
      'email for the new account to which a activate-account message will be sent',
  })
  email: string;
  @ApiProperty({
    description:
      'Roles which should be assigned to the user. They have to exist already.',
  })
  roles: string[];
}
