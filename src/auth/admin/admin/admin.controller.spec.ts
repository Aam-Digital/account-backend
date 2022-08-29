import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminAuthService } from '../admin-auth/admin-auth.service';

describe('AdminController', () => {
  let controller: AdminController;
  const mockAdminAuth = {
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminAuthService, useValue: mockAdminAuth }],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call login with provided credentials', () => {
    controller.authenticate({ username: 'MyUsername', password: 'MyPassword' });

    expect(mockAdminAuth.login).toHaveBeenLastCalledWith(
      'MyUsername',
      'MyPassword',
    );
  });
});
