import { Test, TestingModule } from '@nestjs/testing';
import { AccountController } from './account.controller';
import { HttpService } from '@nestjs/axios';
import { User } from '../auth/user.dto';
import { of } from 'rxjs';
import { NotFoundException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KeycloakService } from './keycloak.service';
import { KeycloakUser } from './keycloak-user.dto';

describe('AccountController', () => {
  let controller: AccountController;
  const mockHttp = {
    put: jest.fn().mockReturnValue(of({ data: undefined })),
    get: jest.fn().mockReturnValue(of({ data: undefined })),
    post: jest.fn().mockReturnValue(of({ date: undefined })),
    delete: jest.fn().mockReturnValue(of({ date: undefined })),
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
    mockHttp.get.mockReturnValue(of({ data: [{ id: 'user-id' }] }));
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
        // set roles
        expect(mockHttp.post).toHaveBeenCalledWith(
          expect.stringMatching(/\/user-id\/role-mappings\/realm$/),
          roles,
        );
        done();
      });
  });

  it('should return a user with the assigned roles', async () => {
    const requestedUser: KeycloakUser = { username: 'my-user', id: 'user-id' };
    const roles = ['user-role-1', 'user-role-2'];
    mockHttp.get.mockImplementation((url: string) =>
      of({ data: url.includes('role-mappings') ? roles : [requestedUser] }),
    );

    const res = await controller.getAccount({ user }, 'my-user');

    expect(res).toEqual({ roles, ...requestedUser });
    expect(mockHttp.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/users$/),
      { params: { username: 'my-user', exact: true } },
    );
    expect(mockHttp.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/users\/user-id\/role-mappings\/realm$/),
    );
  });

  it('should update the account with roles', (done) => {
    mockHttp.get.mockReturnValue(of({ data: ['role1', 'role2'] }));
    const update: KeycloakUser = {
      email: 'new@email.de',
      roles: ['newRole'],
    };

    controller.updateUser({ user }, 'my-user', update).subscribe(() => {
      // send update with `roles` property
      expect(mockHttp.put).toHaveBeenCalledWith(
        expect.stringMatching(/\/users\/my-user$/),
        { email: 'new@email.de', requiredActions: ['VERIFY_EMAIL'] },
      );
      // verification email is sent
      expect(mockHttp.put).toHaveBeenCalledWith(
        expect.stringContaining(
          `execute-actions-email?client_id=${user.client}`,
        ),
        ['VERIFY_EMAIL'],
      );
      // old roles are deleted
      expect(mockHttp.delete).toHaveBeenCalledWith(
        expect.stringMatching(/users\/my-user\/role-mappings\/realm$/),
        { data: ['role1', 'role2'] },
      );
      // new roles are set
      expect(mockHttp.post).toHaveBeenCalledWith(
        expect.stringMatching(/\/my-user\/role-mappings\/realm$/),
        ['newRole'],
      );
      done();
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

  it('should throw an error if multiple results are returned', (done) => {
    mockHttp.get.mockReturnValue(of({ data: ['multiple', 'results'] }));

    controller
      .forgotPassword({
        email: 'some@email.de',
        realm: user.realm,
        client: user.client,
      })
      .subscribe({
        error: (err) => {
          expect(err).toBeInstanceOf(NotFoundException);
          done();
        },
      });
  });

  it('should call roles endpoint', (done) => {
    mockHttp.get.mockReturnValue(of({ data: ['my-role'] }));
    controller.getRoles({ user }).subscribe((roles) => {
      expect(roles).toEqual(['my-role']);
      expect(mockHttp.get).toHaveBeenCalledWith(
        expect.stringContaining(`${user.realm}/roles`),
      );
      done();
    });
  });
});
