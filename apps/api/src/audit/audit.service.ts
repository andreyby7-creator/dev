import { Injectable, Logger } from '@nestjs/common';
import type {
  AuditActionEnum,
  AuditLogFilter,
  AuditLogInsert,
} from '../schemas/audit.schema';
import { AuditLogInsertSchema, AuditStatusEnum } from '../schemas/audit.schema';
import { validateWithLogging } from '../utils/validation';
import { AuditRepository } from './audit.repository';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly auditRepository: AuditRepository) {}

  /**
   * Логирование действий пользователя
   */
  async logUserAction(data: AuditLogInsert): Promise<void> {
    try {
      await this.auditRepository.insert(data);
      this.logger.log(`User action logged: ${data.action}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to log user action: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  /**
   * Получение логов аудита с фильтрацией
   */
  async getAuditLogs(filter: AuditLogFilter = {}): Promise<AuditLogInsert[]> {
    try {
      const logs = await this.auditRepository.findMany(filter);
      return logs;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to get audit logs: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  /**
   * Получение статистики аудита
   */
  async getAuditStats(filter: AuditLogFilter = {}): Promise<{
    total: number;
    success: number;
    failure: number;
    warning: number;
    topActions: Array<{ action: AuditActionEnum; count: number }>;
  }> {
    try {
      const logs = await this.auditRepository.findMany(filter);

      const total = logs.length;
      const success = logs.filter(
        (log: { status: string }) => log.status === AuditStatusEnum.SUCCESS
      ).length;
      const failure = logs.filter(
        (log: { status: string }) => log.status === AuditStatusEnum.FAILURE
      ).length;
      const warning = logs.filter(
        (log: { status: string }) => log.status === AuditStatusEnum.WARNING
      ).length;

      // Подсчет топ действий
      const actionCounts = new Map<AuditActionEnum, number>();
      logs.forEach((log: unknown) => {
        const typedLog = log as { action: AuditActionEnum };
        const action = typedLog.action;
        actionCounts.set(action, (actionCounts.get(action) ?? 0) + 1);
      });

      const topActions = Array.from(actionCounts.entries())
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        total,
        success,
        failure,
        warning,
        topActions,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to get audit stats: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  /**
   * Логирование событий безопасности
   */
  async logSecurityEvent(
    action: AuditActionEnum,
    userId: string,
    userRole: string,
    details: Record<string, unknown> = {},
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await this.auditRepository.insert({
        user_id: userId,
        user_role: userRole,
        action,
        status: AuditStatusEnum.WARNING,
        details: details,
        resource_type: 'security',
        ip_address: ipAddress ?? '',
        user_agent: userAgent ?? '',
      });

      this.logger.warn(`Security event logged: ${action} for user ${userId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to log security event: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  /**
   * Логирование доступа к API
   */
  async logApiAccess(
    action: AuditActionEnum,
    userId: string,
    userRole: string,
    resourceType: string,
    _resourceId?: string,
    details: Record<string, unknown> = {},
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await this.auditRepository.insert({
        user_id: userId,
        user_role: userRole,
        action,
        status: AuditStatusEnum.SUCCESS,
        resource_type: resourceType,
        resource_id: _resourceId,
        details: details,
        ip_address: ipAddress ?? '',
        user_agent: userAgent ?? '',
      });

      this.logger.log(`API access logged: ${action} for user ${userId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to log API access: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  /**
   * Логирование ошибок системы
   */
  async logSystemError(
    action: AuditActionEnum,
    error: Error,
    details: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      await this.auditRepository.insert({
        user_id: 'system',
        user_role: 'system',
        action,
        status: AuditStatusEnum.FAILURE,
        details: {
          error: error.message,
          stack: error.stack,
          ...details,
        },
        resource_type: 'system',
      });

      this.logger.error(`System error logged: ${action} - ${error.message}`);
    } catch (logError) {
      const errorMessage =
        logError instanceof Error ? logError.message : 'Unknown error';
      this.logger.error(
        `Failed to log system error: ${errorMessage}`,
        logError instanceof Error ? logError.stack : undefined
      );
      // Не бросаем ошибку, чтобы не создавать бесконечный цикл
    }
  }

  /**
   * Валидация и логирование данных аудита
   */
  async validateAndLog(data: unknown): Promise<void> {
    try {
      const validatedData = validateWithLogging(
        AuditLogInsertSchema,
        data,
        'AuditLogInsert'
      );

      await this.logUserAction(validatedData);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Validation failed for audit data: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }
}
