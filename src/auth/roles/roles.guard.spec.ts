import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  const reflector = jest.fn();
  const getRequest = jest.fn();
  const context: any = {
    switchToHttp: () => ({ getRequest }),
    getHandler: () => undefined,
  };
  beforeEach(() => {
    guard = new RolesGuard({ get: reflector } as any);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should pass when user has required roles', () => {
    getRequest.mockReturnValue({
      user: { ['_couchdb.roles']: ['r1', 'r2', 'r3'] },
    });
    reflector.mockReturnValue(['r1', 'r3']);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should fail when user is missing a role', () => {
    getRequest.mockReturnValue({
      user: { ['_couchdb.roles']: ['r1', 'r3'] },
    });
    reflector.mockReturnValue(['r1', 'r2']);

    expect(guard.canActivate(context)).toBe(false);
  });
});
