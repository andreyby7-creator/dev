import type { UserRole } from '../types/roles';

/**
 * Type guards для валидации данных из БД
 */
export function isUserRole(role: string | null | undefined): role is UserRole {
  return (
    role === 'admin' ||
    role === 'user' ||
    role === 'super_admin' ||
    role === 'network_manager'
  );
}

export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Утилиты для конвертации данных из БД
 */
export function convertNullableString(value?: string | null): string {
  // Если value null или undefined, вернется пустая строка
  return value ?? '';
}

export function convertDateString(dateString: string): Date {
  if (!isValidDate(dateString)) {
    throw new Error(`Invalid date string: ${dateString}`);
  }
  return new Date(dateString);
}

export function convertUserRole(role: string | null | undefined): UserRole {
  if (!isUserRole(role)) {
    throw new Error(`Invalid user role: ${role}`);
  }
  return role;
}

/**
 * Интерфейсы для типизированных данных
 */
export interface TypedUserData {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone: string;
  avatar: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TypedUserProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatar: string;
  preferences?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
