import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../supabase/supabase.service';

// Типы для Supabase данных
interface SupabaseUser {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

interface SupabaseProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  timezone?: string;
  locale?: string;
  metadata?: Record<string, unknown>;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface IAuthUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
  profile: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    timezone?: string;
    locale?: string;
  };
  metadata: Record<string, unknown>;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuthSession {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  createdAt: Date;
  lastActivity: Date;
}

export interface IAuthResult {
  success: boolean;
  user?: IAuthUser;
  session?: IAuthSession;
  error?: string;
  requiresMFA?: boolean;
  mfaToken?: string;
}

export interface ILoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  mfaCode?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface IRegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  timezone?: string;
  locale?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class UnifiedAuthService {
  private readonly logger = new Logger(UnifiedAuthService.name);
  private activeSessions = new Map<string, IAuthSession>();
  private userCache = new Map<string, IAuthUser>();

  constructor(
    private readonly _configService: ConfigService,
    private jwtService: JwtService,
    private supabaseService: SupabaseService
  ) {
    // Инициализация конфигурации
    this._configService.get('JWT_SECRET');
  }

  async login(credentials: ILoginCredentials): Promise<IAuthResult> {
    try {
      this.logger.log(`Login attempt for email: ${credentials.email}`);

      // 1. Аутентификация через Supabase
      const supabaseResult = await this.supabaseService.auth.signInWithPassword(
        {
          email: credentials.email,
          password: credentials.password,
        }
      );

      if (supabaseResult.error != null) {
        this.logger.warn(
          `Login failed for ${credentials.email}: ${supabaseResult.error.message}`
        );
        return {
          success: false,
          error: supabaseResult.error.message,
        };
      }

      const supabaseUser = supabaseResult.data.user;

      // 2. Получаем или создаем пользователя в нашей системе
      let user = await this.getUserById(supabaseUser.id);
      user ??= await this.createUserFromSupabase(
        supabaseUser as unknown as SupabaseUser,
        {
          email: supabaseUser.email,
        }
      );

      // 3. Обновляем последний вход
      user.lastLogin = new Date();
      await this.updateUser(user);

      // 4. Создаем сессию
      const session = await this.createSession(user, {
        ipAddress: credentials.ipAddress ?? 'unknown',
        userAgent: credentials.userAgent ?? 'unknown',
        rememberMe: credentials.rememberMe ?? false,
      });

      // 5. Генерируем JWT токен
      const token = await this.generateJwtToken(user, session);

      session.token = token;
      this.activeSessions.set(session.id, session);

      this.logger.log(`Login successful for user: ${user.email}`);

      return {
        success: true,
        user,
        session,
      };
    } catch (error) {
      this.logger.error(`Login error for ${credentials.email}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  async register(data: IRegisterData): Promise<IAuthResult> {
    try {
      this.logger.log(`Registration attempt for email: ${data.email}`);

      // 1. Регистрация через Supabase
      const supabaseResult = await this.supabaseService.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            timezone: data.timezone,
            locale: data.locale,
            ...data.metadata,
          },
        },
      });

      if (supabaseResult.error != null) {
        this.logger.warn(
          `Registration failed for ${data.email}: ${supabaseResult.error.message}`
        );
        return {
          success: false,
          error: supabaseResult.error.message,
        };
      }

      const supabaseUser = supabaseResult.data.user;
      if (supabaseUser == null) {
        return {
          success: false,
          error: 'User creation failed',
        };
      }

      // 2. Создаем пользователя в нашей системе
      const user = await this.createUserFromSupabase(
        supabaseUser as unknown as SupabaseUser,
        {
          email: supabaseUser.email,
          firstName: data.firstName,
          lastName: data.lastName,
          timezone: data.timezone,
          locale: data.locale,
          ...data.metadata,
        }
      );

      this.logger.log(`Registration successful for user: ${user.email}`);

      return {
        success: true,
        user,
      };
    } catch (error) {
      this.logger.error(`Registration error for ${data.email}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  async logout(sessionId: string): Promise<boolean> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        return false;
      }

      // Деактивируем сессию
      session.isActive = false;
      this.activeSessions.delete(sessionId);

      // Отзываем токен в Supabase
      await this.supabaseService.auth.signOut();

      this.logger.log(`Logout successful for session: ${sessionId}`);
      return true;
    } catch (error) {
      this.logger.error(`Logout error for session ${sessionId}:`, error);
      return false;
    }
  }

  async validateToken(token: string): Promise<IAuthUser | null> {
    try {
      const payload = this.jwtService.verify(token);
      const session = this.activeSessions.get(payload.sessionId);

      if (!session || !session.isActive || session.expiresAt < new Date()) {
        return null;
      }

      const user = await this.getUserById(session.userId);
      if (!user) {
        return null;
      }

      // Обновляем последнюю активность
      session.lastActivity = new Date();
      this.activeSessions.set(session.id, session);

      return user;
    } catch (error) {
      this.logger.error('Token validation error:', error);
      return null;
    }
  }

  async refreshToken(refreshToken: string): Promise<IAuthResult> {
    try {
      // Находим сессию по refresh token
      const session = Array.from(this.activeSessions.values()).find(
        s => s.refreshToken === refreshToken && s.isActive
      );

      if (!session || session.refreshExpiresAt < new Date()) {
        return {
          success: false,
          error: 'Invalid or expired refresh token',
        };
      }

      const user = await this.getUserById(session.userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Генерируем новый токен
      const newToken = await this.generateJwtToken(user, session);
      session.token = newToken;
      session.lastActivity = new Date();

      this.activeSessions.set(session.id, session);

      return {
        success: true,
        user,
        session,
      };
    } catch (error) {
      this.logger.error('Token refresh error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed',
      };
    }
  }

  async getUserById(userId: string): Promise<IAuthUser | null> {
    // Проверяем кеш
    const cachedUser = this.userCache.get(userId);
    if (cachedUser) {
      return cachedUser;
    }

    try {
      // Получаем пользователя из Supabase
      const { data: profile } = await this.supabaseService
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Получаем роли пользователя
      const { data: userRoles, error: rolesError } = await this.supabaseService
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const roles =
        rolesError != null
          ? ['user']
          : userRoles.map((ur: { role: string }) => ur.role);

      // Получаем разрешения
      const permissions = await this.getUserPermissions(roles);

      const supabaseProfile = profile as unknown as SupabaseProfile;
      const user: IAuthUser = {
        id: supabaseProfile.id,
        email: supabaseProfile.email,
        roles,
        permissions,
        profile: {
          firstName: supabaseProfile.first_name ?? '',
          lastName: supabaseProfile.last_name ?? '',
          avatar: supabaseProfile.avatar_url ?? '',
          timezone: supabaseProfile.timezone ?? 'UTC',
          locale: supabaseProfile.locale ?? 'en',
        },
        metadata: supabaseProfile.metadata ?? {},
        lastLogin:
          supabaseProfile.last_login != null
            ? new Date(supabaseProfile.last_login)
            : new Date(),
        createdAt: new Date(supabaseProfile.created_at),
        updatedAt: new Date(supabaseProfile.updated_at),
      };

      // Кешируем пользователя
      this.userCache.set(userId, user);

      return user;
    } catch (error) {
      this.logger.error(`Error getting user ${userId}:`, error);
      return null;
    }
  }

  async updateUser(user: IAuthUser): Promise<IAuthUser> {
    try {
      // Обновляем в Supabase
      const { error } = await this.supabaseService
        .from('profiles')
        .update({
          first_name: user.profile.firstName,
          last_name: user.profile.lastName,
          avatar_url: user.profile.avatar,
          timezone: user.profile.timezone,
          locale: user.profile.locale,
          metadata: user.metadata,
          last_login: user.lastLogin?.toISOString(),
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', user.id);

      if (error != null) {
        throw new Error(`Failed to update user: ${error.message}`);
      }

      // Обновляем кеш
      this.userCache.set(user.id, user);

      return user;
    } catch (error) {
      this.logger.error(`Error updating user ${user.id}:`, error);
      throw error;
    }
  }

  async getActiveSessions(userId: string): Promise<IAuthSession[]> {
    return Array.from(this.activeSessions.values()).filter(
      session => session.userId === userId && session.isActive
    );
  }

  async revokeSession(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.isActive = false;
    this.activeSessions.delete(sessionId);

    this.logger.log(`Session revoked: ${sessionId}`);
    return true;
  }

  async revokeAllUserSessions(userId: string): Promise<number> {
    const userSessions = Array.from(this.activeSessions.values()).filter(
      session => session.userId === userId && session.isActive
    );

    for (const session of userSessions) {
      session.isActive = false;
      this.activeSessions.delete(session.id);
    }

    this.logger.log(
      `Revoked ${userSessions.length} sessions for user: ${userId}`
    );
    return userSessions.length;
  }

  private async createUserFromSupabase(
    supabaseUser: {
      id: string;
      email: string;
      user_metadata?: Record<string, unknown>;
      [key: string]: unknown;
    },
    additionalData?: Record<string, unknown>
  ): Promise<IAuthUser> {
    const user: IAuthUser = {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      roles: ['user'], // По умолчанию
      permissions: await this.getUserPermissions(['user']),
      profile: {
        firstName:
          (supabaseUser.user_metadata?.first_name as string) ||
          (additionalData?.firstName as string) ||
          '',
        lastName:
          (supabaseUser.user_metadata?.last_name as string) ||
          (additionalData?.lastName as string) ||
          '',
        timezone:
          (supabaseUser.user_metadata?.timezone as string) ||
          (additionalData?.timezone as string) ||
          'UTC',
        locale:
          (supabaseUser.user_metadata?.locale as string) ||
          (additionalData?.locale as string) ||
          'en',
      },
      metadata: {
        ...supabaseUser.user_metadata,
        ...additionalData,
      },
      createdAt: new Date(supabaseUser.created_at as string),
      updatedAt: new Date(),
    };

    // Сохраняем в кеш
    this.userCache.set(user.id, user);

    return user;
  }

  private async createSession(
    user: IAuthUser,
    options: {
      ipAddress: string;
      userAgent: string;
      rememberMe: boolean;
    }
  ): Promise<IAuthSession> {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const refreshToken = `refresh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() +
        (options.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)
    ); // 30 дней или 1 день
    const refreshExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 дней

    const session: IAuthSession = {
      id: sessionId,
      userId: user.id,
      token: '', // Будет установлен позже
      refreshToken,
      expiresAt,
      refreshExpiresAt,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      isActive: true,
      createdAt: now,
      lastActivity: now,
    };

    return session;
  }

  private async generateJwtToken(
    user: IAuthUser,
    session: IAuthSession
  ): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
      sessionId: session.id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(session.expiresAt.getTime() / 1000),
    };

    return this.jwtService.sign(payload);
  }

  private async getUserPermissions(roles: string[]): Promise<string[]> {
    // В реальном приложении здесь была бы логика получения разрешений на основе ролей
    const rolePermissions: Record<string, string[]> = {
      user: ['read:profile', 'update:profile'],
      admin: ['read:profile', 'update:profile', 'read:users', 'update:users'],
      super_admin: ['*'], // Все разрешения
    };

    const permissions = new Set<string>();

    for (const role of roles) {
      const rolePerms = rolePermissions[role] ?? [];
      rolePerms.forEach(perm => permissions.add(perm));
    }

    return Array.from(permissions);
  }
}
