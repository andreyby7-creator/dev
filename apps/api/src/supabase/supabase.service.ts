import type { OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import type { Database, TypedSupabaseClient } from './supabase.types';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabase!: TypedSupabaseClient;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY'
    );

    if (
      supabaseUrl == null ||
      supabaseUrl === '' ||
      supabaseUrl.length === 0 ||
      supabaseServiceKey == null ||
      supabaseServiceKey === '' ||
      supabaseServiceKey.length === 0
    ) {
      throw new Error(
        'SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY должны быть установлены'
      );
    }

    this.supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);
  }

  // Экспортируем методы для доступа к auth и from
  get auth() {
    return this.supabase.auth;
  }

  get from() {
    return this.supabase.from;
  }

  // Дополнительные методы
  get client() {
    return this.supabase;
  }
}
