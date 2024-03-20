import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AccountModule } from './account/account.module';
import { ConfigModule } from '@nestjs/config';
import { AppConfiguration } from './config/configuration';

@Module({
  imports: [
    AuthModule,
    AccountModule,
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: false,
      load: [AppConfiguration],
    }),
  ],
})
export class AppModule {}
