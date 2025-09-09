import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrismaService } from '../test/mocks/prisma.service.mock';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let mockPrismaService: ReturnType<typeof createMockPrismaService>;

  beforeEach(async () => {
    mockPrismaService = createMockPrismaService();

    service = new UsersService(mockPrismaService as unknown as PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.findAll();

      expect(result).toEqual(mockUsers);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith();
    });

    it('should return empty array when no users exist', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith();
    });

    it('should handle database errors', async () => {
      mockPrismaService.user.findMany.mockRejectedValue(
        new Error('Database error')
      );

      await expect(service.findAll()).rejects.toThrow('Database error');
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

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne('1');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should return null when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findOne('nonexistent');

      expect(result).toBeNull();
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent' },
      });
    });

    it('should handle database errors', async () => {
      mockPrismaService.user.findUnique.mockRejectedValue(
        new Error('Database error')
      );

      await expect(service.findOne('1')).rejects.toThrow('Database error');
    });
  });

  describe('update', () => {
    it('should update user with valid data', async () => {
      const updateData = {
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

      mockPrismaService.user.update.mockResolvedValue(mockUpdatedUser);

      const result = await service.update('1', updateData);

      expect(result).toEqual(mockUpdatedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateData,
      });
    });

    it('should return null when user not found for update', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'User',
      };

      mockPrismaService.user.update.mockRejectedValue(
        new Error('Record not found')
      );

      const result = await service.update('nonexistent', updateData);

      expect(result).toBeNull();
    });

    it('should return null when database error occurs during update', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'User',
      };

      mockPrismaService.user.update.mockRejectedValue(
        new Error('Database error')
      );

      const result = await service.update('1', updateData);

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      mockPrismaService.user.delete.mockResolvedValue({ id: '1' });

      const result = await service.delete('1');

      expect(result).toBe(true);
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should return false when user not found for deletion', async () => {
      mockPrismaService.user.delete.mockRejectedValue(
        new Error('Record not found')
      );

      const result = await service.delete('nonexistent');

      expect(result).toBe(false);
    });

    it('should return false when database error occurs during deletion', async () => {
      mockPrismaService.user.delete.mockRejectedValue(
        new Error('Database error')
      );

      const result = await service.delete('1');

      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    it('should create user with all required fields', async () => {
      const userData = {
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
      };

      const mockCreatedUser: User = {
        id: '3',
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        phone: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.create.mockResolvedValue(mockCreatedUser);

      const result = await service.create(userData);

      expect(result).toEqual(mockCreatedUser);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: userData,
      });
    });

    it('should create user with optional fields', async () => {
      const userData = {
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        phone: '+1234567890',
        isActive: false,
      };

      const mockCreatedUser: User = {
        id: '3',
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        phone: '+1234567890',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.create.mockResolvedValue(mockCreatedUser);

      const result = await service.create(userData);

      expect(result).toEqual(mockCreatedUser);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: userData,
      });
    });

    it('should handle database errors during creation', async () => {
      const userData = {
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
      };

      mockPrismaService.user.create.mockRejectedValue(
        new Error('Database error')
      );

      await expect(service.create(userData)).rejects.toThrow('Database error');
    });

    it('should handle duplicate email error', async () => {
      const userData = {
        email: 'existing@example.com',
        firstName: 'New',
        lastName: 'User',
      };

      mockPrismaService.user.create.mockRejectedValue(
        new Error('Unique constraint failed on the field: email')
      );

      await expect(service.create(userData)).rejects.toThrow(
        'Unique constraint failed on the field: email'
      );
    });
  });
});
