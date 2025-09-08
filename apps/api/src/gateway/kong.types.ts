// Kong API типы
export interface KongService {
  id: string;
  name: string;
  url: string;
  protocol: string;
  host: string;
  port: number;
  path: string;
  version?: string;
  created_at: string;
  updated_at: string;
}

export interface KongRoute {
  id: string;
  service_id: string;
  name: string;
  protocols: string[];
  methods: string[];
  hosts: string[];
  paths: string[];
  strip_path: boolean;
  preserve_host: boolean;
  regex_priority: number;
  https_redirect_status_code: number;
  path_handling: string;
  created_at: string;
  updated_at: string;
}

export interface KongPlugin {
  id: string;
  name: string;
  service_id?: string;
  route_id?: string;
  consumer_id?: string;
  config: Record<string, unknown>;
  protocols: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface KongConsumer {
  id: string;
  username: string;
  custom_id?: string;
  created_at: string;
  updated_at: string;
}

export interface KongApiKey {
  id: string;
  key: string;
  consumer_id: string;
  created_at: string;
  updated_at: string;
}

export interface KongResponse<T> {
  data: T[];
  next?: string;
  offset?: string;
}

export interface KongError {
  message: string;
  name: string;
  code: number;
}

// Rate Limiting типы
export interface RateLimitConfig {
  minute?: number;
  hour?: number;
  day?: number;
  policy: 'local' | 'redis' | 'cluster';
}

export interface RateLimitStats {
  remaining: number;
  reset: number;
  limit: number;
  retry_after?: number;
}

// Circuit Breaker типы
export interface CircuitBreakerConfig {
  timeout: number;
  error_threshold_percentage: number;
  reset_timeout: number;
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  last_failure_time?: number;
  next_attempt_time?: number;
}

// Load Balancer типы
export type LoadBalancingAlgorithm =
  | 'round-robin'
  | 'least-connections'
  | 'ip-hash'
  | 'weighted-round-robin';

export interface LoadBalancerConfig {
  algorithm: LoadBalancingAlgorithm;
  upstream_hosts: string[];
  health_checks?: {
    active: boolean;
    passive: boolean;
    interval: number;
    timeout: number;
    unhealthy_threshold: number;
    healthy_threshold: number;
  };
}

export interface LoadBalancerStats {
  total_requests: number;
  active_connections: number;
  upstream_health: Record<string, boolean>;
  algorithm: LoadBalancingAlgorithm;
}
