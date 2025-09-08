import * as Sentry from '@sentry/nextjs';

const sentryConfig: Parameters<typeof Sentry.init>[0] = {
  environment: process.env.NODE_ENV ?? 'development',

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',
};

// Add DSN only if it exists
const sentryDsn = process.env['SENTRY_DSN'];
if (sentryDsn) {
  sentryConfig.dsn = sentryDsn;
}

Sentry.init(sentryConfig);

// Capture unhandled promise rejections
process.on('unhandledRejection', reason => {
  Sentry.captureException(reason);
});
