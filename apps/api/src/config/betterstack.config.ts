import { Logger } from '@nestjs/common';
import { getEnv, hasEnv } from '../utils/getEnv';

export class BetterStackLogger extends Logger {
  private source: string;

  constructor(context: string) {
    super(context);
    this.source = context;
  }

  log(message: string, context?: string) {
    super.log(message, context);
    this.sendToBetterStack('info', message, context);
  }

  error(message: string, trace?: string, context?: string) {
    super.error(message, trace, context);
    this.sendToBetterStack('error', message, context, trace);
  }

  warn(message: string, context?: string) {
    super.warn(message, context);
    this.sendToBetterStack('warn', message, context);
  }

  debug(message: string, context?: string) {
    super.debug(message, context);
    this.sendToBetterStack('debug', message, context);
  }

  verbose(message: string, context?: string) {
    super.verbose(message, context);
    this.sendToBetterStack('verbose', message, context);
  }

  private sendToBetterStack(
    level: string,
    message: string,
    context?: string,
    trace?: string
  ) {
    if (hasEnv('BETTERSTACK_SOURCE_TOKEN')) {
      const logData = {
        level,
        message,
        source: this.source,
        context,
        timestamp: new Date().toISOString(),
        environment: getEnv('NODE_ENV', 'string', { default: 'development' }),
        ...(trace != null && trace !== '' && trace.length > 0 && { trace }),
      };

      // Отправляем в BetterStack через HTTP API
      fetch('https://logs.betterstack.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getEnv('BETTERSTACK_SOURCE_TOKEN', 'string', { required: true })}`,
        },
        body: JSON.stringify(logData),
      }).catch(error => {
        // Fallback к console если BetterStack недоступен

        console.error('Failed to send log to BetterStack:', error);
      });
    }
  }
}
