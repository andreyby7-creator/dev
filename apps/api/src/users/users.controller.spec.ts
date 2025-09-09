import type { User } from '@prisma/client';
import { vi } from 'vitest';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  beforeEach(async () => {
    const mockUsersService = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    controller = new UsersController(
      mockUsersService as unknown as UsersService
    );
    usersService = mockUsersService as unknown as UsersService;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const mockUsers: User[] = [
        {
          id: '1',
          email: 'user1@example.com',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1234567890',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          email: 'user2@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          phone: '+0987654321',
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(usersService.findAll).mockResolvedValue(mockUsers);

      const result = await controller.findAll();

      expect(result).toEqual(mockUsers);
      expect(usersService.findAll).toHaveBeenCalledWith();
    });

    it('should return empty array when no users exist', async () => {
      vi.mocked(usersService.findAll).mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
      expect(usersService.findAll).toHaveBeenCalledWith();
    });

    it('should handle service errors', async () => {
      vi.mocked(usersService.findAll).mockRejectedValue(
        new Error('Service error')
      );

      await expect(controller.findAll()).rejects.toThrow('Service error');
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      const mockUser: User = {
        id: '1',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(usersService.findOne).mockResolvedValue(mockUser);

      const result = await controller.findOne('1');

      expect(result).toEqual(mockUser);
      expect(usersService.findOne).toHaveBeenCalledWith('1');
    });

    it('should return null when user not found', async () => {
      vi.mocked(usersService.findOne).mockResolvedValue(null);

      const result = await controller.findOne('nonexistent');

      expect(result).toBeNull();
      expect(usersService.findOne).toHaveBeenCalledWith('nonexistent');
    });

    it('should handle service errors', async () => {
      vi.mocked(usersService.findOne).mockRejectedValue(
        new Error('Service error')
      );

      await expect(controller.findOne('1')).rejects.toThrow('Service error');
    });
  });

  describe('update', () => {
    it('should update user with valid data', async () => {
      const updateUserDto = {
        firstName: 'Updated',
        lastName: 'User',
      };

      const mockUpdatedUser: User = {
        id: '1',
        email: 'user@example.com',
        firstName: 'Updated',
        lastName: 'User',
        phone: '+1234567890',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(usersService.update).mockResolvedValue(mockUpdatedUser);

      const result = await controller.update('1', updateUserDto);

      expect(result).toEqual(mockUpdatedUser);
      expect(usersService.update).toHaveBeenCalledWith('1', updateUserDto);
    });

    it('should return null when user not found for update', async () => {
      const updateUserDto = {
        firstName: 'Updated',
        lastName: 'User',
      };

      vi.mocked(usersService.update).mockResolvedValue(null);

      const result = await controller.update('nonexistent', updateUserDto);

      expect(result).toBeNull();
      expect(usersService.update).toHaveBeenCalledWith(
        'nonexistent',
        updateUserDto
      );
    });

    it('should handle service errors during update', async () => {
      const updateUserDto = {
        firstName: 'Updated',
        lastName: 'User',
      };

      vi.mocked(usersService.update).mockRejectedValue(
        new Error('Service error')
      );

      await expect(controller.update('1', updateUserDto)).rejects.toThrow(
        'Service error'
      );
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      vi.mocked(usersService.delete).mockResolvedValue(true);

      const result = await controller.delete('1');

      expect(result).toEqual({ success: true });
      expect(usersService.delete).toHaveBeenCalledWith('1');
    });

    it('should return success false when user not found', async () => {
      vi.mocked(usersService.delete).mockResolvedValue(false);

      const result = await controller.delete('nonexistent');

      expect(result).toEqual({ success: false });
      expect(usersService.delete).toHaveBeenCalledWith('nonexistent');
    });

    it('should handle service errors during deletion', async () => {
      vi.mocked(usersService.delete).mockRejectedValue(
        new Error('Service error')
      );

      await expect(controller.delete('1')).rejects.toThrow('Service error');
    });
  });

  describe('create', () => {
    it('should create user with valid data', async () => {
      const createUserDto = {
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        phone: '+1234567890',
        isActive: true,
      };

      const mockCreatedUser: User = {
        id: '3',
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        phone: '+1234567890',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(usersService.create).mockResolvedValue(mockCreatedUser);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(mockCreatedUser);
      expect(usersService.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should create user with minimal required data', async () => {
      const createUserDto = {
        email: 'minimal@example.com',
        firstName: 'Minimal',
        lastName: 'User',
      };

      const mockCreatedUser: User = {
        id: '4',
        email: 'minimal@example.com',
        firstName: 'Minimal',
        lastName: 'User',
        phone: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(usersService.create).mockResolvedValue(mockCreatedUser);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(mockCreatedUser);
      expect(usersService.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should handle service errors during creation', async () => {
      const createUserDto = {
        email: 'error@example.com',
        firstName: 'Error',
        lastName: 'User',
      };

      vi.mocked(usersService.create).mockRejectedValue(
        new Error('Service error')
      );

      await expect(controller.create(createUserDto)).rejects.toThrow(
        'Service error'
      );
    });

    it('should handle duplicate email error', async () => {
      const createUserDto = {
        email: 'existing@example.com',
        firstName: 'Existing',
        lastName: 'User',
      };

      vi.mocked(usersService.create).mockRejectedValue(
        new Error('Unique constraint failed on the field: email')
      );

      await expect(controller.create(createUserDto)).rejects.toThrow(
        'Unique constraint failed on the field: email'
      );
    });
  });
});
