import { Test, TestingModule } from '@nestjs/testing';
import { AdminAuthService } from './admin-auth.service';
import { firstValueFrom, of, throwError } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { OIDCTokenResponse } from '../oidc-token-response.dto';
import { HttpException, UnauthorizedException } from '@nestjs/common';

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  const tokenResponse: OIDCTokenResponse = {
    access_token: 'my-access-token',
    refresh_token: 'my-refresh-token',
    expires_in: 300,
  };
  const mockHttpService = {
    post: () => of({ data: tokenResponse }),
    axiosRef: { defaults: { headers: { common: { Authorization: '' } } } },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuthService,
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    service = module.get<AdminAuthService>(AdminAuthService);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

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

  it('should automatically use refresh token before access token expires', async () => {
    jest
      .spyOn(mockHttpService, 'post')
      .mockReturnValue(of({ data: tokenResponse }));

    await firstValueFrom(service.login('username', 'password'));

    expect(mockHttpService.post).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime((tokenResponse.expires_in - 60) * 1000);

    expect(mockHttpService.post).toHaveBeenCalledTimes(2);
    expect(mockHttpService.post).toHaveBeenLastCalledWith(
      expect.stringMatching(/protocol\/openid-connect\/token/),
      expect.stringMatching(
        /refresh_token=my-refresh-token&grant_type=refresh_token/,
      ),
    );

    jest.advanceTimersByTime((tokenResponse.expires_in - 60) * 1000);

    expect(mockHttpService.post).toHaveBeenCalledTimes(3);
  });

  it('should throw unauthorized exception if request fails', () => {
    jest
      .spyOn(mockHttpService, 'post')
      .mockReturnValue(
        throwError(() => new HttpException('fake-exception', 400)),
      );

    return expect(
      firstValueFrom(service.login('username', 'password')),
    ).rejects.toThrow(UnauthorizedException);
  });
});
