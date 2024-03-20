import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppConfiguration } from './config/configuration';
import { configureSentry } from './sentry.configuration';

async function bootstrap() {
  // load ConfigService instance to access .env and app.yaml values
  const configService = new ConfigService(AppConfiguration());

  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: process.env.CORS });

  // SwaggerUI setup see https://docs.nestjs.com/openapi/introduction#bootstrap
  const config = new DocumentBuilder()
    .setTitle(process.env.npm_package_name)
    .setDescription(process.env.npm_package_description)
    .setVersion(process.env.npm_package_version)
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  configureSentry(app, configService);

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
