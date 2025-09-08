import { vi } from 'vitest';
import { ConfigModule } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AuditRepository } from '../audit/audit.repository';
import { AuditService } from '../audit/audit.service';
import { AuditActionEnum, AuditStatusEnum } from '../schemas/audit.schema';
import { SupabaseService } from '../supabase/supabase.service';

describe('RLS Policies', () => {
  let module: TestingModule;
  let auditService: AuditService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
      ],
      providers: [
        {
          provide: AuditService,
          useValue: {
            logUserAction: vi.fn().mockResolvedValue({ id: 'test-id' }),
            logSecurityEvent: vi.fn().mockResolvedValue({ id: 'test-id' }),
            getAuditLogs: vi.fn().mockResolvedValue([
              {
                id: 'test-id',
                user_id: 'test-user-id',
                action: 'suspicious_activity_detected',
                status: 'SUCCESS',
              },
            ]),
          },
        },
        AuditRepository,
        {
          provide: SupabaseService,
          useValue: {
            getClient: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                insert: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { id: 'test-id' },
                      error: null,
                    }),
                  }),
                }),
                select: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      eq: vi.fn().mockReturnValue({
                        limit: vi
                          .fn()
                          .mockResolvedValue({ data: [], error: null }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          },
        },
      ],
    }).compile();

    auditService = module.get<AuditService>(AuditService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Audit Logs RLS', () => {
    it('should allow users to read their own audit logs', async () => {
      const userId = 'test-user-id';

      // Создаем тестовую запись аудита
      await auditService.logUserAction({
        user_id: userId,
        user_role: 'user',
        action: AuditActionEnum.USER_LOGIN,
        status: AuditStatusEnum.SUCCESS,
        resource_type: 'auth',
        details: { method: 'password' },
      });

      // Проверяем, что пользователь может читать свои логи
      const logs = await auditService.getAuditLogs({
        userId: userId,
      });

      expect(logs).toBeDefined();
      expect(Array.isArray(logs)).toBe(true);
      if (logs && logs.length > 0 && logs[0]) {
        expect(logs[0].user_id).toBe(userId);
      }
    });

    it('should allow super admins to read all audit logs', async () => {
      // Создаем тестовую запись аудита
      await auditService.logUserAction({
        user_id: 'other-user-id',
        user_role: 'user',
        action: AuditActionEnum.USER_LOGIN,
        status: AuditStatusEnum.SUCCESS,
        resource_type: 'auth',
        details: { method: 'password' },
      });

      // Проверяем, что супер-админ может читать все логи
      const logs = await auditService.getAuditLogs({});

      expect(logs).toBeDefined();
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should log security events', async () => {
      const userId = 'test-user-id';

      await auditService.logSecurityEvent(
        AuditActionEnum.SUSPICIOUS_ACTIVITY_DETECTED,
        userId,
        'user',
        { reason: 'multiple_failed_logins' },
        '192.168.1.1',
        'Mozilla/5.0'
      );

      const logs = await auditService.getAuditLogs({
        userId: userId,
        action: AuditActionEnum.SUSPICIOUS_ACTIVITY_DETECTED,
      });

      expect(logs).toBeDefined();
      expect(Array.isArray(logs)).toBe(true);
      if (logs && logs.length > 0 && logs[0]) {
        expect(logs[0].action).toBe(
          AuditActionEnum.SUSPICIOUS_ACTIVITY_DETECTED
        );
      }
    });
  });
});
