import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AccountModule } from './account/account.module';
import { SeverityLevel } from '@sentry/node';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SentryInterceptor, SentryModule } from '@ntegral/nestjs-sentry';
import { APP_INTERCEPTOR } from '@nestjs/core';

const lowSeverityLevels: SeverityLevel[] = ['log', 'info'];

@Module({
  providers: [
    { provide: APP_INTERCEPTOR, useFactory: () => new SentryInterceptor() },
  ],
  imports: [
    AuthModule,
    AccountModule,
    ConfigModule.forRoot({ isGlobal: true }),
    SentryModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        if (!configService.get('SENTRY_DSN')) {
          return;
        }

        return {
          dsn: configService.get('SENTRY_DSN'),
          debug: true,
          environment: 'prod',
          release: 'accounts@' + process.env.npm_package_version,
          whitelistUrls: [/https?:\/\/(.*)\.?aam-digital\.com/],
          initialScope: {
            tags: {
              // ID of the docker container in which this is run
              hostname: process.env.HOSTNAME || 'unknown',
            },
          },
          beforeSend: (event) => {
            if (lowSeverityLevels.includes(event.level)) {
              return null;
            } else {
              return event;
            }
          },
        };
      },
    }),
  ],
})
export class AppModule {}
