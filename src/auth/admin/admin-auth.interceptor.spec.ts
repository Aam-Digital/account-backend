import { AdminAuthInterceptor } from './admin-auth.interceptor';

describe('AdminAuthInterceptor', () => {
  it('should be defined', () => {
    expect(new AdminAuthInterceptor()).toBeDefined();
  });
});
