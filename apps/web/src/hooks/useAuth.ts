'use client';

import { useEffect, useState } from 'react';

import { auth, type User } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export function useAuth(): {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: typeof auth.signIn;
  signUp: typeof auth.signUp;
  signOut: typeof auth.signOut;
  signInWithGoogle: typeof auth.signInWithGoogle;
  signInWithGitHub: typeof auth.signInWithGitHub;
  signInWithMagicLink: typeof auth.signInWithMagicLink;
} {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Получаем текущего пользователя
    const getInitialUser = async (): Promise<void> => {
      const { user: currentUser } = await auth.getCurrentUser();
      if (currentUser) {
        setUser({
          id: currentUser.id,
          email: currentUser.email || '',
          name: (currentUser as any).user_metadata?.name, // eslint-disable-line @typescript-eslint/no-explicit-any
          role: 'user', // По умолчанию, будет получаться из profiles таблицы
        });
      }
      setLoading(false);
    };

    getInitialUser();

    // Слушаем изменения аутентификации
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: (session.user as any).user_metadata?.name, // eslint-disable-line @typescript-eslint/no-explicit-any
          role: 'user', // По умолчанию, будет получаться из profiles таблицы
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    signIn: auth.signIn,
    signUp: auth.signUp,
    signOut: auth.signOut,
    signInWithGoogle: auth.signInWithGoogle,
    signInWithGitHub: auth.signInWithGitHub,
    signInWithMagicLink: auth.signInWithMagicLink,
  };
}
