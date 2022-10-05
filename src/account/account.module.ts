import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { HttpModule } from '@nestjs/axios';
import { KeycloakService } from './keycloak.service';

@Module({
  controllers: [AccountController],
  providers: [KeycloakService],
  imports: [HttpModule],
})
export class AccountModule {}
