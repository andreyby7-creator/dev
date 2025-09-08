import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { ElasticsearchService } from '../services/elasticsearch.service';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    const userAgent = req.get('User-Agent') ?? 'Unknown';
    const ip = req.ip ?? req.connection.remoteAddress ?? 'Unknown';
    const middleware = this; // eslint-disable-line @typescript-eslint/no-this-alias

    // Логируем начало запроса
    this.logRequest(req, requestId, ip, userAgent);

    // Перехватываем ответ
    const originalSend = res.send;
    res.send = function (body: unknown) {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Логируем завершение запроса
      middleware.logResponse(
        req,
        res,
        requestId,
        responseTime,
        statusCode,
        body
      );

      return originalSend.call(this, body);
    };

    next();
  }

  private logRequest(
    req: Request,
    requestId: string,
    ip: string,
    userAgent: string
  ) {
    const logData = {
      requestId,
      method: req.method,
      url: req.url,
      ip,
      userAgent,
      headers: this.sanitizeHeaders(req.headers),
      body: this.sanitizeBody(req.body),
      timestamp: new Date().toISOString(),
      type: 'request',
    };

    void this.elasticsearchService.info(
      `HTTP ${req.method} ${req.url}`,
      logData
    );
  }

  private logResponse(
    req: Request,
    _res: Response,
    requestId: string,
    responseTime: number,
    statusCode: number,
    body: unknown
  ) {
    const logData = {
      requestId,
      method: req.method,
      url: req.url,
      statusCode,
      responseTime,
      responseSize:
        typeof body === 'string' ? body.length : JSON.stringify(body).length,
      timestamp: new Date().toISOString(),
      type: 'response',
    };

    const level = statusCode >= 400 ? 'error' : 'info';
    const message = `HTTP ${req.method} ${req.url} - ${statusCode} (${responseTime}ms)`;

    if (level === 'error') {
      void this.elasticsearchService.error(message, logData);
    } else {
      void this.elasticsearchService.info(message, logData);
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeHeaders(
    headers: Record<string, unknown>
  ): Record<string, unknown> {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

    sensitiveHeaders.forEach(header => {
      if (
        sanitized[header] !== undefined &&
        sanitized[header] !== null &&
        sanitized[header] !== ''
      ) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private sanitizeBody(body: unknown): unknown {
    if (body == null || typeof body !== 'object') return body;

    const sanitized = { ...(body as Record<string, unknown>) };
    const sensitiveFields = ['password', 'token', 'secret', 'key'];

    sensitiveFields.forEach(field => {
      if (
        sanitized[field] !== undefined &&
        sanitized[field] !== null &&
        sanitized[field] !== ''
      ) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
