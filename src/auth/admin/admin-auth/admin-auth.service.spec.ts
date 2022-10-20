import { Test, TestingModule } from '@nestjs/testing';
import { AdminAuthService } from './admin-auth.service';
import { firstValueFrom, of } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { OIDCTokenResponse } from '../oidc-token-response.dto';
import { ConfigModule } from '@nestjs/config';
import { HttpStatus } from '@nestjs/common';

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  const tokenResponse: OIDCTokenResponse = {
    access_token: 'my-access-token',
  };
  let rejectedCallback;
  const mockHttpService = {
    post: () => of({ data: tokenResponse }),
    request: jest.fn().mockReturnValue(of({ data: undefined })),
    axiosRef: {
      interceptors: {
        response: { use: (ful, rej) => (rejectedCallback = rej) },
      },
      defaults: { headers: { common: { Authorization: '' } } },
    },
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [
        AdminAuthService,
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    service = module.get<AdminAuthService>(AdminAuthService);
    jest.clearAllMocks();
  });

  afterEach(() => jest.useRealTimers());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should login with username and password', () => {
    jest.spyOn(mockHttpService, 'post');

    service.login('MyUsername', 'MyPassword');

    expect(mockHttpService.post).toHaveBeenCalledWith(
      expect.stringMatching(/protocol\/openid-connect\/token/),
      expect.stringMatching(
        /username=MyUsername&password=MyPassword&grant_type=password/,
      ),
    );
  });

  it('should set returned access_token as axios default header', async () => {
    await firstValueFrom(service.login('username', 'pass'));

    expect(
      mockHttpService.axiosRef.defaults.headers.common.Authorization,
    ).toEqual('Bearer ' + tokenResponse.access_token);
  });

  it('should retry request after logging in if the request failed with an unauthorized status code', async () => {
    const config = { url: 'https://example.com' };
    const response = { status: HttpStatus.UNAUTHORIZED };
    jest.spyOn(service, 'login');

    await rejectedCallback({ config, response });

    expect(service.login).toHaveBeenCalled();
    expect(mockHttpService.request).toHaveBeenCalledWith(config);
  });

  it('should just return the exception if request was to an openid-connect endpoint and failed', () => {
    jest.spyOn(service, 'login');
    const config = { url: 'https://example.com/openid-connect/token' };
    const response = { status: HttpStatus.UNAUTHORIZED };

    try {
      rejectedCallback({ config, response });
      fail();
    } catch (e) {
      expect(service.login).not.toHaveBeenCalled();
      expect(e).toEqual({ config, response });
    }
  });
});
