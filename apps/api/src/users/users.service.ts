import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  async findOne(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(userData: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    isActive?: boolean;
  }): Promise<User> {
    return this.prisma.user.create({ data: userData });
  }

  async update(
    id: string,
    userData: {
      email?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      isActive?: boolean;
    }
  ): Promise<User | null> {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: userData,
      });
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.user.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
}
