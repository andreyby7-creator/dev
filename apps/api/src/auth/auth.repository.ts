import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import type { Database } from '../supabase/supabase.types';
import type { CreateUserArgs } from '../types/custom';

@Injectable()
export class AuthRepository {
  constructor(private readonly supabaseService: SupabaseService) {}

  async createSimpleUser(data: CreateUserArgs) {
    const { data: result, error } = (await this.supabaseService.client.rpc(
      'create_simple_user',
      data as unknown as never
    )) as {
      data:
        | Database['public']['Functions']['create_simple_user']['Returns']
        | null;
      error: unknown;
    };

    if (error != null) {
      throw new Error(`Failed to create user: ${error}`);
    }

    return result;
  }

  async findUserById(id: string) {
    const { data: user, error } = (await this.supabaseService.client
      .from('users')
      .select('*')
      .eq('id', id)
      .single()) as {
      data: Database['public']['Tables']['users']['Row'] | null;
      error: unknown;
    };

    if (error != null) {
      throw new Error(`Failed to get user: ${error}`);
    }

    return user;
  }

  async findUserWithProfiles(userId: string) {
    const { data: user, error } = (await this.supabaseService.client
      .from('users')
      .select(
        `
        *,
        user_profiles (*)
      `
      )
      .eq('id', userId)
      .single()) as {
      data:
        | (Database['public']['Tables']['users']['Row'] & {
            user_profiles: Database['public']['Tables']['user_profiles']['Row'][];
          })
        | null;
      error: unknown;
    };

    if (error != null) {
      throw new Error(`Failed to get user with profiles: ${error}`);
    }

    return user;
  }
}
