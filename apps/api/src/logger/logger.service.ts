import type { LoggerService as NestLoggerService } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import pino from 'pino';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger = pino({
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  });

  log(message: string, ...meta: unknown[]) {
    this.logger.info({ meta }, message);
  }

  error(message: string, trace?: string, ...meta: unknown[]) {
    this.logger.error({ trace, meta }, message);
  }

  warn(message: string, ...meta: unknown[]) {
    this.logger.warn({ meta }, message);
  }

  debug(message: string, ...meta: unknown[]) {
    this.logger.debug({ meta }, message);
  }

  verbose(message: string, ...meta: unknown[]) {
    this.logger.trace({ meta }, message);
  }
}
