// Типы для миграции на новый стек
export interface IMigrationUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
  profile: {
    firstName: string;
    lastName: string;
    avatar?: string;
    timezone: string;
    locale: string;
  };
  metadata: Record<string, unknown>;
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMigrationPermission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  resourceId?: string;
}

export interface IMigrationAuthResult {
  allowed: boolean;
  userPermissions: string[];
  conditions?: Record<string, unknown>;
}

export interface IMigrationSecurityEvent {
  id: string;
  timestamp: Date;
  type: 'authentication' | 'authorization' | 'data_access' | 'configuration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  userId: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  result: 'success' | 'failure';
  details: Record<string, unknown>;
  tags: string[];
}
