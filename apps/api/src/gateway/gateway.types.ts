import type { Request, Response } from 'express';

export interface IGatewayRequest extends Request {
  user?: {
    id: string;
    email: string;
    roles: string[];
  };
}

export type IGatewayResponse = Response;

export interface IServiceInstance {
  id: string;
  url: string;
  health: 'healthy' | 'unhealthy' | 'degraded';
  weight: number;
  lastCheck: Date;
  responseTime: number;
  errorCount: number;
}

export interface IServiceConfig {
  name: string;
  instances: IServiceInstance[];
  algorithm: 'round-robin' | 'least-connections' | 'weighted' | 'ip-hash';
  healthCheck: {
    path: string;
    interval: number;
    timeout: number;
  };
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;
    recoveryTimeout: number;
  };
}

export interface IRateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (req: IGatewayRequest) => string;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
}

export interface ICircuitBreakerState {
  status: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: Date;
  nextAttemptTime: Date;
}

export interface ILoadBalancerStats {
  totalRequests: number;
  activeConnections: number;
  healthyInstances: number;
  unhealthyInstances: number;
  averageResponseTime: number;
}

export interface IRouteConfig {
  path: string;
  method: string;
  _service: string;
  rateLimit?: IRateLimitConfig;
  circuitBreaker?: {
    enabled: boolean;
    failureThreshold: number;
    recoveryTimeout: number;
  };
  authentication?: {
    required: boolean;
    roles?: string[];
  };
}
