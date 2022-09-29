import { Test, TestingModule } from '@nestjs/testing';
import { AccountController } from './account.controller';
import { HttpService } from '@nestjs/axios';
import { User } from '../auth/user.dto';
import { of } from 'rxjs';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KeycloakService } from './keycloak.service';

describe('AccountController', () => {
  let controller: AccountController;
  const mockHttp = {
    put: jest.fn().mockReturnValue(of({ data: undefined })),
    get: jest.fn().mockReturnValue(of({ data: undefined })),
    post: jest.fn().mockReturnValue(of({ date: undefined })),
  };
  const user: User = {
    sub: 'user-id',
    realm: 'ndb-dev',
    client: 'app',
    ['_couchdb.roles']: [AccountController.ACCOUNT_MANAGEMENT_ROLE],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      controllers: [AccountController],
      providers: [
        KeycloakService,
        { provide: HttpService, useValue: mockHttp },
      ],
    }).compile();

    controller = module.get<AccountController>(AccountController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a new account with provided roles and send a verification mail', (done) => {
    mockHttp.get.mockImplementation((url: string) =>
      of({ data: url.includes('users') ? [{ id: 'user-id' }] : 'my-role' }),
    );
    const email = 'my@email.com';
    const username = 'my-name';
    const roles = ['user_app', 'admin_app'];

    controller
      .createAccount({ user }, { username, email, roles })
      .subscribe(() => {
        // created user
        expect(mockHttp.post).toHaveBeenCalledWith(
          expect.stringMatching(/\/ndb-dev\/users$/),
          expect.objectContaining({ username, email }),
        );
        // sent verification email
        expect(mockHttp.put).toHaveBeenCalledWith(
          expect.stringMatching(/\/user-id\/execute-actions-email/),
          ['VERIFY_EMAIL'],
        );
        // looked for roles
        expect(mockHttp.get).toHaveBeenCalledWith(
          expect.stringMatching(/\/roles\/user_app$/),
        );
        expect(mockHttp.get).toHaveBeenCalledWith(
          expect.stringMatching(/\/roles\/admin_app$/),
        );
        // set roles
        expect(mockHttp.post).toHaveBeenCalledWith(
          expect.stringMatching(/\/user-id\/role-mappings\/realm$/),
          ['my-role', 'my-role'],
        );
        done();
      });
  });

  it('should not allow to create account if required role is missing', (done) => {
    const otherUser = Object.assign({}, user);
    otherUser['_couchdb.roles'] = [];

    controller
      .createAccount(
        { user: otherUser },
        { username: 'username', email: 'some-email', roles: [] },
      )
      .subscribe({
        error: (err) => {
          expect(err).toBeInstanceOf(UnauthorizedException);
          done();
        },
      });
  });

  it('should set the email and send a verification request', (done) => {
    const email = 'example@mail.com';
    controller.setEmail({ user }, { email }).subscribe(() => {
      expect(mockHttp.put.mock.calls).toEqual([
        [
          expect.stringContaining(
            `admin/realms/${user.realm}/users/${user.sub}`,
          ),
          { email, requiredActions: ['VERIFY_EMAIL'] },
        ],
        [
          expect.stringContaining(
            `execute-actions-email?client_id=${user.client}`,
          ),
          ['VERIFY_EMAIL'],
        ],
      ]);
      done();
    });
  });

  it('should load user and send password reset request', (done) => {
    const email = 'example@mail.com';
    mockHttp.get.mockReturnValue(
      of({ data: [{ id: user.sub, email: email }] }),
    );

    controller
      .forgotPassword({
        email,
        realm: user.realm,
        client: user.client,
      })
      .subscribe(() => {
        expect(mockHttp.put).toHaveBeenCalledWith(
          expect.stringContaining(
            `${user.realm}/users/${user.sub}/execute-actions-email?client_id=${user.client}&redirect_uri=`,
          ),
          ['UPDATE_PASSWORD'],
        );
        done();
      });
  });

  it('should throw an error if the email does not exactly match', (done) => {
    const email = 'example@mail';
    mockHttp.get.mockReturnValue(
      of({ data: [{ id: user.sub, email: email + '.com' }] }),
    );

    controller
      .forgotPassword({
        email,
        realm: user.realm,
        client: user.client,
      })
      .subscribe({
        error: (err) => {
          expect(err).toBeInstanceOf(BadRequestException);
          done();
        },
      });
  });
});
