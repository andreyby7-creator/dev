// API constants
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/profile',
  },
  USERS: {
    BASE: '/users',
    PROFILE: '/users/profile',
    SETTINGS: '/users/settings',
  },
  CARDS: {
    BASE: '/cards',
    MY_CARDS: '/cards/my',
    SCAN: '/cards/scan',
  },
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const API_ERROR_MESSAGES = {
  UNAUTHORIZED: 'Не авторизован',
  FORBIDDEN: 'Доступ запрещен',
  NOT_FOUND: 'Ресурс не найден',
  VALIDATION_ERROR: 'Ошибка валидации',
  INTERNAL_ERROR: 'Внутренняя ошибка сервера',
} as const;
