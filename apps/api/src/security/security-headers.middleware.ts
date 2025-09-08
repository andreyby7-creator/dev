import type { NestMiddleware } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityHeadersMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    // Content Security Policy (CSP)
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:; frame-ancestors 'none';"
    );

    // X-Content-Type-Options
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // X-Frame-Options
    res.setHeader('X-Frame-Options', 'DENY');

    // X-XSS-Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
    );

    // Strict-Transport-Security (HSTS)
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );

    // Cache Control для API endpoints
    if (req.path.startsWith('/api/')) {
      res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate'
      );
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    // X-Powered-By (скрываем информацию о сервере)
    res.removeHeader('X-Powered-By');

    // Server (скрываем информацию о сервере)
    res.setHeader('Server', 'SaleSpot API');

    // Cross-Origin Resource Policy
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

    // Cross-Origin Opener Policy
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

    // Cross-Origin Embedder Policy
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

    // Origin-Agent-Cluster
    res.setHeader('Origin-Agent-Cluster', '?1');

    // Дополнительные заголовки для API безопасности
    if (req.path.startsWith('/api/')) {
      // Rate Limiting Headers (если используются)
      res.setHeader('X-RateLimit-Limit', '1000');
      res.setHeader('X-RateLimit-Remaining', '999');
      res.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + 3600);

      // API Version
      res.setHeader('X-API-Version', '1.0.0');

      // Request ID для трейсинга
      const requestId = req.get('X-Request-ID') ?? this.generateRequestId();
      res.setHeader('X-Request-ID', requestId);
    }

    // Логируем добавление заголовков безопасности
    this.logger.debug(`Security headers added for ${req.method} ${req.path}`);

    next();
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
