import { BearerStrategy } from './bearer.strategy';
import { HttpService } from '@nestjs/axios';
import { Test } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { HttpException, UnauthorizedException } from '@nestjs/common';

describe('BearerStrategy', () => {
  // Valid JWT
  const token =
    'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ0YnBQOGI3VS1qY3lTcFVraV9uTFNvb3VJWmFiQUtVYTVKdTdXR0N4MW1ZIn0.eyJleHAiOjE2NjE3NTMyNzAsImlhdCI6MTY2MTc1Mjk3MCwianRpIjoiYjljODY2ZjYtZTA1Yy00MGM0LWFhMDUtNTExZjUzMmYxNzg3IiwiaXNzIjoiaHR0cHM6Ly9rZXljbG9hay5hYW0tZGlnaXRhbC5jb20vcmVhbG1zL25kYi1kZXYiLCJhdWQiOiJhY2NvdW50Iiwic3ViIjoiNzJhZGQxZmMtZWIzNS00MmUwLTk1ZTQtNjdjNmZmMGMyMTRiIiwidHlwIjoiQmVhcmVyIiwiYXpwIjoiYXBwIiwic2Vzc2lvbl9zdGF0ZSI6IjNhYjAwMmE4LTFkMjktNDQwYy05MjZmLWJkZTc0NzFmODA1MSIsImFjciI6IjEiLCJhbGxvd2VkLW9yaWdpbnMiOlsiKiJdLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsiZGVmYXVsdC1yb2xlcy1uZGItZGV2Iiwib2ZmbGluZV9hY2Nlc3MiLCJ1bWFfYXV0aG9yaXphdGlvbiIsInVzZXJfYXBwIl19LCJyZXNvdXJjZV9hY2Nlc3MiOnsiYWNjb3VudCI6eyJyb2xlcyI6WyJtYW5hZ2UtYWNjb3VudCIsIm1hbmFnZS1hY2NvdW50LWxpbmtzIiwidmlldy1wcm9maWxlIl19fSwic2NvcGUiOiJlbWFpbCBwcm9maWxlIiwic2lkIjoiM2FiMDAyYTgtMWQyOS00NDBjLTkyNmYtYmRlNzQ3MWY4MDUxIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIl9jb3VjaGRiLnJvbGVzIjpbImRlZmF1bHQtcm9sZXMtbmRiLWRldiIsIm9mZmxpbmVfYWNjZXNzIiwidW1hX2F1dGhvcml6YXRpb24iLCJ1c2VyX2FwcCJdLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJkZW1vIiwiZ2l2ZW5fbmFtZSI6IiIsImZhbWlseV9uYW1lIjoiIiwiZW1haWwiOiJzaW1vbkBhYW0tZGlnaXRhbC5jb20iLCJ1c2VybmFtZSI6ImRlbW8ifQ.KtY8y_DUeL_fVLplOtu7GSPmxrX4pIVDONpoFMJ3TYiygWSSBBqvSDwRWtjaNRrU-2wiG8GelFNoZtlQym7BQhWqV3vTbZ_ZMG1cUlD_2OIb0z4JN2WoASMmAkjY9g1sJGVGL4LRGbReVmENuLzlZ5xFooshzf0YkV7V1x0MzcQY1wN65aUYz1arcrmRIZd-EyumYy0C1gpAjt4zmo5nWKpIzld6YGssjWZCnbBnnNXOtFxoXvcgH8bchj0dw9V34-Pixact6UTF6irUuJV4mJj_8hmEQ5x9pM0qoeHB2unXA8oRxLoMSBVP7zVrRLfWsKcC9lpcZ3CexBJabjnUDA';
  // userinfo response
  const userinfo = {
    sub: '72add1fc-eb35-42e0-95e4-67c6ff0c214b',
    email_verified: true,
    '_couchdb.roles': [
      'default-roles-ndb-dev',
      'offline_access',
      'uma_authorization',
      'user_app',
    ],
    preferred_username: 'demo',
    given_name: '',
    family_name: '',
    email: 'my@email.com',
    username: 'demo',
  };
  let strategy: BearerStrategy;
  const mockHttpService = {
    get: () => of(undefined as any),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BearerStrategy,
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();
    strategy = module.get(BearerStrategy);
  });

  it('should create a user object including the realm and client info', async () => {
    jest.spyOn(mockHttpService, 'get').mockReturnValue(of({ data: userinfo }));

    const user = await strategy.validate(token);

    expect(user).toEqual(
      Object.assign({ realm: 'ndb-dev', client: 'app' }, userinfo),
    );
  });

  it('should throw unauthorized exception if request fails', () => {
    jest
      .spyOn(mockHttpService, 'get')
      .mockReturnValue(throwError(() => new HttpException('error', 400)));

    return expect(strategy.validate(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
