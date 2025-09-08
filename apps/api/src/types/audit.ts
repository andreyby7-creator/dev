import type { AuditActionEnum, AuditStatusEnum } from '../schemas/audit.schema';

// Интерфейс для записи аудита
export interface IAuditLog {
  id: string;
  userId: string;
  userRole: string;
  action: AuditActionEnum;
  status: AuditStatusEnum;
  resourceType: string;
  resourceId: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

// DTO для создания записи аудита
export interface ICreateAuditLogDto {
  userId: string;
  userRole: string;
  action: AuditActionEnum;
  status: AuditStatusEnum;
  resourceType?: string;
  _resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

// Интерфейс для фильтрации логов аудита
export interface IAuditLogFilter {
  userId?: string;
  userRole?: string;
  action?: AuditActionEnum;
  status?: AuditStatusEnum;
  resourceType?: string;
  _resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// Интерфейс для статистики аудита
export interface IAuditStats {
  totalActions: number;
  successCount: number;
  failureCount: number;
  warningCount: number;
  topActions: Array<{ action: AuditActionEnum; count: number }>;
  topUsers: Array<{ userId: string; count: number }>;
  topRoles: Array<{ role: string; count: number }>;
}

// Интерфейс для событий безопасности
export interface ISecurityEvent {
  action: AuditActionEnum;
  userId: string;
  userRole: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// Интерфейс для доступа к API
export interface IApiAccessEvent {
  action: AuditActionEnum;
  userId: string;
  userRole: string;
  status: AuditStatusEnum;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}
