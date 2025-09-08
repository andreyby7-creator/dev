'use client';

import { useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';

import { supabase } from '@/lib/supabase';

function SignOutContent(): JSX.Element {
  const router = useRouter();

  useEffect(() => {
    const handleSignOut = async (): Promise<void> => {
      await supabase.auth.signOut();
      router.push('/');
    };

    handleSignOut();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Выход из системы
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Вы выходите из системы...
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignOut(): JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Выход из системы...</p>
          </div>
        </div>
      }
    >
      <SignOutContent />
    </Suspense>
  );
}
