import { z } from 'zod';

// Схема для валидации UserRole
export const UserRoleSchema = z.enum([
  'user',
  'brand_manager',
  'store_manager',
  'network_manager',
  'super_admin',
]);

// Схема для валидации логина
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

// Схема для валидации регистрации
export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  role: UserRoleSchema.optional(),
});

// Схема для валидации CreateUserArgs
export const CreateUserArgsSchema = z.object({
  user_email: z.string().email(),
  user_password: z.string().min(6).max(128),
  user_first_name: z.string().min(1).max(50),
  user_last_name: z.string().min(1).max(50),
  user_role: UserRoleSchema,
});

// Схема для валидации профиля пользователя
export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: UserRoleSchema,
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  phone: z.string().nullable(),
  avatar: z.string().url().nullable(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Схема для валидации JWT payload
export const JwtPayloadSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: UserRoleSchema,
  iat: z.number(),
  exp: z.number(),
});

// Типы, извлеченные из схем
export type UserRole = z.infer<typeof UserRoleSchema>;
export type LoginData = z.infer<typeof LoginSchema>;
export type RegisterData = z.infer<typeof RegisterSchema>;
export type CreateUserArgs = z.infer<typeof CreateUserArgsSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type JwtPayload = z.infer<typeof JwtPayloadSchema>;

// Функции валидации
export const validateLogin = (data: unknown): LoginData => {
  return LoginSchema.parse(data);
};

export const validateRegister = (data: unknown): RegisterData => {
  return RegisterSchema.parse(data);
};

export const validateCreateUserArgs = (data: unknown): CreateUserArgs => {
  return CreateUserArgsSchema.parse(data);
};

export const validateUserProfile = (data: unknown): UserProfile => {
  return UserProfileSchema.parse(data);
};

export const validateJwtPayload = (data: unknown): JwtPayload => {
  return JwtPayloadSchema.parse(data);
};

// Безопасная валидация (не выбрасывает исключения)
export const safeValidateLogin = (data: unknown) => {
  return LoginSchema.safeParse(data);
};

export const safeValidateRegister = (data: unknown) => {
  return RegisterSchema.safeParse(data);
};

export const safeValidateCreateUserArgs = (data: unknown) => {
  return CreateUserArgsSchema.safeParse(data);
};

export const safeValidateUserProfile = (data: unknown) => {
  return UserProfileSchema.safeParse(data);
};

export const safeValidateJwtPayload = (data: unknown) => {
  return JwtPayloadSchema.safeParse(data);
};
