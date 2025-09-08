'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AuthErrorContent(): JSX.Element {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (error: string | null): string => {
    switch (error) {
      case 'Configuration':
        return 'Проблема с конфигурацией сервера';
      case 'AccessDenied':
        return 'Доступ запрещен';
      case 'Verification':
        return 'Токен верификации истек или уже использован';
      case 'Default':
        return 'Произошла ошибка при входе в систему';
      default:
        return 'Неизвестная ошибка';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Ошибка аутентификации
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {getErrorMessage(error)}
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            <p className="text-sm">{getErrorMessage(error)}</p>
          </div>

          <div className="flex justify-center">
            <Link
              href="/auth/signin"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Попробовать снова
            </Link>
          </div>

          <div className="text-center">
            <Link
              href="/"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Вернуться на главную
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthError(): JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Загрузка...</p>
          </div>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
