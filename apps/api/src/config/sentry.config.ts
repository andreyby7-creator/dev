import * as Sentry from '@sentry/node';
import { getConfig, getMonitoringConfig } from './env.config';

export function initSentry() {
  const config = getConfig();
  const monitoring = getMonitoringConfig();

  if (monitoring.sentryDsn != null && monitoring.sentryDsn !== '') {
    Sentry.init({
      dsn: monitoring.sentryDsn,
      environment: config.NODE_ENV,
      // Performance Monitoring
      tracesSampleRate: config.NODE_ENV === 'production' ? 0.1 : 1.0,
      // Set sampling rate for profiling - this is relative to tracesSampleRate
      profilesSampleRate: config.NODE_ENV === 'production' ? 0.1 : 1.0,
      // Enable debug mode in development
      debug: config.NODE_ENV === 'development',
    });
  }
}

export { Sentry };
