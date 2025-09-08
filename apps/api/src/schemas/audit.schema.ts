import { z } from 'zod';
import { AuditActionEnum, AuditStatusEnum } from './audit.enum';

// Реэкспортируем enum для использования в других модулях
export { AuditActionEnum, AuditStatusEnum };

// Схема для валидации AuditAction
export const AuditActionSchema = z.union([
  z.literal('user_login'),
  z.literal('user_logout'),
  z.literal('user_register'),
  z.literal('user_update_profile'),
  z.literal('user_change_password'),
  z.literal('user_delete_account'),
  z.literal('role_assigned'),
  z.literal('role_removed'),
  z.literal('permission_granted'),
  z.literal('permission_revoked'),
  z.literal('network_created'),
  z.literal('network_updated'),
  z.literal('network_deleted'),
  z.literal('store_created'),
  z.literal('store_updated'),
  z.literal('store_deleted'),
  z.literal('brand_created'),
  z.literal('brand_updated'),
  z.literal('brand_deleted'),
  z.literal('loyalty_card_created'),
  z.literal('loyalty_card_updated'),
  z.literal('loyalty_card_deleted'),
  z.literal('payment_processed'),
  z.literal('refund_issued'),
  z.literal('campaign_created'),
  z.literal('campaign_updated'),
  z.literal('campaign_deleted'),
  z.literal('report_generated'),
  z.literal('system_setting_changed'),
  z.literal('suspicious_activity_detected'),
  z.literal('account_locked'),
  z.literal('account_unlocked'),
  z.literal('api_key_created'),
  z.literal('api_key_revoked'),
]);

// Схема для валидации AuditStatus
export const AuditStatusSchema = z.union([
  z.literal('success'),
  z.literal('failure'),
  z.literal('warning'),
  z.literal('info'),
]);

// Схема для валидации AuditLogInsert
export const AuditLogInsertSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  user_role: z.string(),
  action: AuditActionSchema,
  status: AuditStatusSchema,
  resource_type: z.string().nullable().optional(),
  resource_id: z.string().nullable().optional(),
  details: z.record(z.string(), z.unknown()).nullable().optional(),
  ip_address: z.string().nullable().optional(),
  user_agent: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

// Тип для AuditLogInsert
export type AuditLogInsert = z.infer<typeof AuditLogInsertSchema>;

// Схема для валидации AuditLogFilter
export const AuditLogFilterSchema = z.object({
  userId: z.string().uuid().optional(),
  userRole: z.string().optional(),
  action: AuditActionSchema.optional(),
  status: AuditStatusSchema.optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().positive().optional(),
  offset: z.number().nonnegative().optional(),
});

// Тип для AuditLogFilter
export type AuditLogFilter = z.infer<typeof AuditLogFilterSchema>;

// Функции валидации
export const validateAuditLogInsert = (data: unknown): AuditLogInsert => {
  return AuditLogInsertSchema.parse(data);
};

export const validateAuditLogFilter = (data: unknown): AuditLogFilter => {
  return AuditLogFilterSchema.parse(data);
};

// Безопасная валидация (не выбрасывает исключения)
export const safeValidateAuditLogInsert = (data: unknown) => {
  return AuditLogInsertSchema.safeParse(data);
};

export const safeValidateAuditLogFilter = (data: unknown) => {
  return AuditLogFilterSchema.safeParse(data);
};
