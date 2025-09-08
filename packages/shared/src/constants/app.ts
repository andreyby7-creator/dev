// App constants
export const APP_CONFIG = {
  NAME: 'SaleSpot BY',
  VERSION: '1.0.0',
  DESCRIPTION: 'SaaS платформа для карт лояльности и маркетинговых кампаний',
  AUTHOR: 'SaleSpot Team',
  SUPPORT_EMAIL: 'support@salespot.by',
} as const;

export const APP_FEATURES = {
  LOYALTY_CARDS: 'loyalty_cards',
  MARKETING_CAMPAIGNS: 'marketing_campaigns',
  ANALYTICS: 'analytics',
  USER_MANAGEMENT: 'user_management',
  API_GATEWAY: 'api_gateway',
  SECURITY: 'security',
} as const;

export const APP_ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  CARDS: '/cards',
  CAMPAIGNS: '/campaigns',
  ANALYTICS: '/analytics',
  USERS: '/users',
} as const;

export const APP_STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  THEME: 'theme',
  LANGUAGE: 'language',
} as const;
