import type { NestMiddleware } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { WafService } from './waf.service';

@Injectable()
export class WafMiddleware implements NestMiddleware {
  private readonly logger = new Logger(WafMiddleware.name);

  constructor(private readonly wafService: WafService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Получаем IP адрес клиента
    const clientIp = this.getClientIp(req);

    // Получаем User-Agent
    const userAgent = req.get('User-Agent') ?? 'Unknown';

    // Получаем URL и метод
    const url = req.url;
    const method = req.method;

    // Получаем заголовки
    const headers = this.extractHeaders(req);

    // Получаем тело запроса (если есть)
    const body = req.body != null ? JSON.stringify(req.body) : undefined;

    // Проверяем запрос через WAF
    const requestData: {
      sourceIp: string;
      userAgent: string;
      url: string;
      method: string;
      headers: Record<string, string>;
      body?: string;
    } = {
      sourceIp: clientIp,
      userAgent,
      url,
      method,
      headers,
    };

    if (body != null && body !== '') {
      requestData.body = body;
    }

    try {
      const result = await this.wafService.inspectRequest(requestData);

      if (!result.allowed) {
        this.logger.warn(
          `WAF blocked request from ${clientIp}: ${result.reason}`
        );

        // Отправляем ответ об ошибке
        res.status(403).json({
          error: 'Request blocked by WAF',
          reason: result.reason,
          ruleId: result.ruleId,
          ruleName: result.ruleName,
          severity: result.severity,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Если запрос разрешен, продолжаем
      next();
    } catch (error) {
      this.logger.error(
        `WAF inspection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );

      // В случае ошибки WAF, разрешаем запрос (fail-open)
      next();
    }
  }

  private getClientIp(req: Request): string {
    // Проверяем различные заголовки для получения реального IP
    const xForwardedFor = req.get('X-Forwarded-For');
    const xRealIp = req.get('X-Real-IP');
    const xClientIp = req.get('X-Client-IP');
    const cfConnectingIp = req.get('CF-Connecting-IP');

    if (cfConnectingIp != null && cfConnectingIp !== '') {
      return cfConnectingIp;
    }

    if (xForwardedFor != null && xForwardedFor !== '') {
      // X-Forwarded-For может содержать несколько IP через запятую
      const ips = xForwardedFor.split(',').map(ip => ip.trim());
      return ips[0] ?? req.ip ?? req.connection.remoteAddress ?? '127.0.0.1';
    }

    if (xRealIp != null && xRealIp !== '') {
      return xRealIp;
    }

    if (xClientIp != null && xClientIp !== '') {
      return xClientIp;
    }

    return req.ip ?? req.connection.remoteAddress ?? '127.0.0.1';
  }

  private extractHeaders(req: Request): Record<string, string> {
    const headers: Record<string, string> = {};

    // Извлекаем основные заголовки безопасности
    const securityHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
      'x-csrf-token',
      'x-requested-with',
      'content-type',
      'content-length',
      'host',
      'origin',
      'referer',
      'user-agent',
    ];

    for (const headerName of securityHeaders) {
      const value = req.get(headerName);
      if (value != null && value !== '') {
        headers[headerName] = value;
      }
    }

    return headers;
  }
}
