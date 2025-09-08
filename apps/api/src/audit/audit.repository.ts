import { Injectable } from '@nestjs/common';
import type { AuditLogInsert } from '../schemas/audit.schema';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuditRepository {
  constructor(private readonly supabaseService: SupabaseService) {}

  async insert(data: AuditLogInsert) {
    const { data: result, error } = await this.supabaseService.client
      .from('audit_logs')
      .insert([data as unknown as never]) // Локальный каст к never для обхода TS
      .select()
      .single();

    if (error != null) {
      throw new Error(`Failed to insert audit log: ${error.message}`);
    }

    return result;
  }

  async findMany(filter: {
    userId?: string | undefined;
    userRole?: string | undefined;
    action?: string | undefined;
    status?: string | undefined;
    resourceType?: string | undefined;
    _resourceId?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }) {
    let query = this.supabaseService.client
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (filter.userId != null) {
      query = query.eq('user_id', filter.userId);
    }

    if (filter.userRole != null) {
      query = query.eq('user_role', filter.userRole);
    }

    if (filter.action != null) {
      query = query.eq('action', filter.action);
    }

    if (filter.status != null) {
      query = query.eq('status', filter.status);
    }

    if (filter.resourceType != null) {
      query = query.eq('resource_type', filter.resourceType);
    }

    if (filter._resourceId != null) {
      query = query.eq('resource_id', filter._resourceId);
    }

    if (filter.startDate != null) {
      query = query.gte('timestamp', filter.startDate);
    }

    if (filter.endDate != null) {
      query = query.lte('timestamp', filter.endDate);
    }

    if (filter.limit != null) {
      query = query.limit(filter.limit);
    }

    if (filter.offset != null) {
      query = query.range(
        filter.offset,
        filter.offset + (filter.limit ?? 50) - 1
      );
    }

    const { data, error } = await query;

    if (error != null) {
      throw new Error(`Failed to get audit logs: ${error.message}`);
    }

    return data;
  }
}
