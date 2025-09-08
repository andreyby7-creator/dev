import type { UserRole } from './roles';

export interface IUser {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string | undefined;
  lastName?: string | undefined;
  phone?: string | undefined;
  avatar?: string | undefined;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserProfile {
  id: string;
  userId: string;
  firstName?: string | undefined;
  lastName?: string | undefined;
  phone?: string | undefined;
  avatar?: string | undefined;
  preferences?: Record<string, unknown> | undefined;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserWithProfile extends IUser {
  profile?: IUserProfile;
}

export interface ICreateUserDto {
  email: string;
  password: string;
  role?: UserRole;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface IUpdateUserDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  isActive?: boolean;
}

export interface ILoginDto {
  email: string;
  password: string;
}

export interface ILoginResponse {
  user: IUserWithProfile;
  accessToken: string;
  refreshToken: string;
}
