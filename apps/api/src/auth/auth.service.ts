import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../supabase/supabase.service';
import type { Database } from '../supabase/supabase.types';
import type { CreateUserArgs } from '../types/custom';
import { UserRole } from '../types/roles';
import type {
  ICreateUserDto,
  ILoginDto,
  ILoginResponse,
  IUserWithProfile,
} from '../types/user';
import { AuthRepository } from './auth.repository';
import type { TypedUserData } from './auth.types';
import {
  convertDateString,
  convertNullableString,
  convertUserRole,
} from './auth.types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly jwtService: JwtService,
    private readonly authRepository: AuthRepository
  ) {}

  async login(loginDto: ILoginDto): Promise<ILoginResponse> {
    const { email, password } = loginDto;

    try {
      // Простая проверка пользователя в нашей таблице
      const { data: userData, error: userError } =
        (await this.supabaseService.client
          .from('users')
          .select('*')
          .eq('email', email)
          .eq('is_active', true)
          .single()) as {
          data: Database['public']['Tables']['users']['Row'] | null;
          error: unknown;
        };

      if (userError != null || userData == null) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // В реальном проекте здесь должна быть проверка хеша пароля
      // Пока что просто проверяем что пользователь существует
      if (password.length < 6) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Конвертируем данные из БД в типизированные
      const typedUserData: TypedUserData = {
        id: userData.id,
        email: userData.email,
        role: convertUserRole(userData.role),
        firstName: convertNullableString(userData.first_name),
        lastName: convertNullableString(userData.last_name),
        phone: convertNullableString(userData.phone),
        avatar: convertNullableString(userData.avatar),
        isActive: Boolean(userData.is_active),
        createdAt: new Date(userData.created_at),
        updatedAt: new Date(userData.updated_at),
      };

      const payload = {
        id: typedUserData.id,
        email: typedUserData.email,
        role: typedUserData.role,
      };

      const accessToken = this.jwtService.sign(payload);
      const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

      return {
        user: typedUserData,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Login failed');
    }
  }

  async register(createUserDto: ICreateUserDto): Promise<ILoginResponse> {
    const { email, password, role, firstName, lastName } = createUserDto;

    try {
      // Проверяем что пользователь не существует
      const { data: existingUser } = (await this.supabaseService.client
        .from('users')
        .select('id')
        .eq('email', email)
        .single()) as { data: { id: string } | null; error: unknown };

      if (existingUser) {
        throw new ConflictException('User already exists');
      }

      // Используем репозиторий для создания пользователя
      const createUserData: CreateUserArgs = {
        user_email: email,
        user_password: password,
        user_first_name: firstName ?? '',
        user_last_name: lastName ?? '',
        user_role: role ?? UserRole.USER,
      };

      const result = await this.authRepository.createSimpleUser(createUserData);

      if (result == null) {
        this.logger.error(
          'Registration failed: no result from create_simple_user'
        );
        throw new ConflictException('Registration failed');
      }

      // Получаем созданного пользователя
      const userData = await this.authRepository.findUserById(result.id);

      if (userData == null) {
        throw new ConflictException('Failed to get user profile');
      }

      // Конвертируем данные из БД в типизированные
      const typedUserData: TypedUserData = {
        id: userData.id,
        email: userData.email,
        role: convertUserRole(userData.role),
        firstName: convertNullableString(userData.first_name),
        lastName: convertNullableString(userData.last_name),
        phone: convertNullableString(userData.phone),
        avatar: convertNullableString(userData.avatar),
        isActive: Boolean(userData.is_active),
        createdAt: new Date(userData.created_at),
        updatedAt: new Date(userData.updated_at),
      };

      const payload = {
        id: typedUserData.id,
        email: typedUserData.email,
        role: typedUserData.role,
      };

      const accessToken = this.jwtService.sign(payload);
      const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

      return {
        user: typedUserData,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      this.logger.error('Registration error:', error);
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new ConflictException('Registration failed');
    }
  }

  async getProfile(userId: string): Promise<IUserWithProfile> {
    try {
      const user = await this.authRepository.findUserWithProfiles(userId);

      if (user == null) {
        throw new UnauthorizedException('User not found');
      }

      // Конвертируем данные из БД в типизированные
      const typedUserData: TypedUserData = {
        id: user.id,
        email: user.email,
        role: convertUserRole(user.role),
        firstName: convertNullableString(user.first_name),
        lastName: convertNullableString(user.last_name),
        phone: convertNullableString(user.phone),
        avatar: convertNullableString(user.avatar),
        isActive: user.is_active,
        createdAt: convertDateString(user.created_at),
        updatedAt: convertDateString(user.updated_at),
      };

      const result: IUserWithProfile = {
        id: typedUserData.id,
        email: typedUserData.email,
        role: typedUserData.role,
        firstName: typedUserData.firstName,
        lastName: typedUserData.lastName,
        phone: typedUserData.phone,
        avatar: typedUserData.avatar,
        isActive: typedUserData.isActive,
        createdAt: typedUserData.createdAt,
        updatedAt: typedUserData.updatedAt,
      };

      if (user.user_profiles[0] != null) {
        const profileData = user.user_profiles[0];
        result.profile = {
          id: profileData.id,
          userId: profileData.user_id,
          firstName: convertNullableString(profileData.first_name),
          lastName: convertNullableString(profileData.last_name),
          phone: convertNullableString(profileData.phone),
          avatar: convertNullableString(profileData.avatar),
          preferences: profileData.preferences ?? undefined,
          createdAt: convertDateString(profileData.created_at),
          updatedAt: convertDateString(profileData.updated_at),
        };
      }

      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Failed to get profile');
    }
  }
}
