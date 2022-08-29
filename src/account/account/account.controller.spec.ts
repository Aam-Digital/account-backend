import { Test, TestingModule } from '@nestjs/testing';
import { AccountController } from './account.controller';
import { HttpService } from '@nestjs/axios';
import { User } from '../../auth/user.dto';
import { of } from 'rxjs';

describe('AccountController', () => {
  let controller: AccountController;
  const mockHttpService = {
    put: jest.fn().mockReturnValue(of(undefined)),
    get: jest.fn().mockReturnValue(of(undefined)),
  };
  const user: User = {
    sub: 'user-id',
    realm: 'ndb-dev',
    client: 'app',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [{ provide: HttpService, useValue: mockHttpService }],
    }).compile();

    controller = module.get<AccountController>(AccountController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should set the email and send a verification request', async () => {
    const email = 'example@mail.com';
    const prom = controller.setEmail({ user }, { email });

    expect(mockHttpService.put).toHaveBeenLastCalledWith(
      expect.stringContaining(`admin/realms/${user.realm}/users/${user.sub}`),
      { email, requiredActions: ['VERIFY_EMAIL'] },
    );

    await prom;

    expect(mockHttpService.put).toHaveBeenLastCalledWith(
      expect.stringContaining(`execute-actions-email?client_id=${user.client}`),
      ['VERIFY_EMAIL'],
    );
  });

  it('should load user and send password reset request', async () => {
    const email = 'example@mail.com';
    mockHttpService.get.mockReturnValue(of({ data: [{ id: user.sub }] }));

    await controller.forgotEmail({
      email,
      realm: user.realm,
      client: user.client,
    });

    expect(mockHttpService.put).toHaveBeenCalledWith(
      expect.stringContaining(
        `${user.realm}/users/${user.sub}/execute-actions-email?client_id=${user.client}&redirect_uri=`,
      ),
      ['UPDATE_PASSWORD'],
    );
  });
});
