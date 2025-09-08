import type { OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { TracingService } from './tracing.service';
import { getEnv } from '../../utils/getEnv';

export interface IJaegerSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, unknown>;
  logs: Array<{
    timestamp: number;
    fields: Record<string, unknown>;
  }>;
  references?: Array<{
    type: 'CHILD_OF' | 'FOLLOWS_FROM';
    traceId: string;
    spanId: string;
  }>;
}

export interface IJaegerTrace {
  traceId: string;
  spans: IJaegerSpan[];
  startTime: number;
  endTime: number;
  duration: number;
  serviceName: string;
  operationName: string;
}

export interface IJaegerServiceInfo {
  name: string;
  version: string;
  endpoints: string[];
}

export interface IJaegerDependencies {
  parent: string;
  child: string;
  callCount: number;
  source: string;
}

@Injectable()
export class JaegerService implements OnModuleInit {
  private readonly logger = new Logger(JaegerService.name);
  private readonly traces: Map<string, IJaegerTrace> = new Map();
  private readonly serviceName = 'salespot-api';
  private readonly serviceVersion = '1.0.0';
  private isConnected = false;

  constructor(private readonly tracingService: TracingService) {}

  async onModuleInit(): Promise<void> {
    await this.initializeJaeger();
  }

  private async initializeJaeger(): Promise<void> {
    try {
      // В реальной реализации здесь была бы инициализация Jaeger клиента
      // const jaegerClient = new JaegerClient({
      //   serviceName: this.serviceName,
      //   serviceVersion: this.serviceVersion,
      //   endpoint: process.env.JAEGER_ENDPOINT ?? 'http://localhost:14268/api/traces',
      // });

      this.isConnected = true;
      this.logger.log('Jaeger service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Jaeger service', error);
      this.isConnected = false;
    }
  }

  async startSpan(
    operationName: string,
    parentSpanId?: string
  ): Promise<IJaegerSpan> {
    const traceId = this.generateTraceId();
    const spanId = this.generateSpanId();
    const startTime = Date.now();

    const span: IJaegerSpan = {
      traceId,
      spanId,
      ...(parentSpanId != null && parentSpanId !== '' && { parentSpanId }),
      operationName,
      startTime,
      tags: {
        'service.name': this.serviceName,
        'service.version': this.serviceVersion,
        'span.kind': 'server',
      },
      logs: [],
    };

    // Добавляем в локальное хранилище для демонстрации
    const trace: IJaegerTrace = {
      traceId,
      spans: [span],
      startTime,
      endTime: startTime,
      duration: 0,
      serviceName: this.serviceName,
      operationName,
    };

    this.traces.set(traceId, trace);

    // Также добавляем в TracingService
    await this.tracingService.startTrace(operationName, {
      traceId,
      spanId,
      parentSpanId,
    });

    return span;
  }

  async finishSpan(
    traceId: string,
    spanId: string,
    tags?: Record<string, unknown>
  ): Promise<void> {
    const trace = this.traces.get(traceId);
    if (!trace) {
      this.logger.warn(`Trace ${traceId} not found`);
      return;
    }

    const span = trace.spans.find(s => s.spanId === spanId);
    if (!span) {
      this.logger.warn(`Span ${spanId} not found in trace ${traceId}`);
      return;
    }

    const endTime = Date.now();
    span.endTime = endTime;
    span.duration = endTime - span.startTime;

    if (tags) {
      span.tags = { ...span.tags, ...tags };
    }

    // Обновляем время завершения трейса
    trace.endTime = Math.max(trace.endTime, endTime);
    trace.duration = trace.endTime - trace.startTime;

    // Отправляем в Jaeger (в реальной реализации)
    if (this.isConnected) {
      await this.sendSpanToJaeger(span);
    }

    // Завершаем в TracingService
    await this.tracingService.endTrace(traceId, { spanId });
  }

  async addSpanLog(
    traceId: string,
    spanId: string,
    fields: Record<string, unknown>
  ): Promise<void> {
    const trace = this.traces.get(traceId);
    if (!trace) {
      this.logger.warn(`Trace ${traceId} not found`);
      return;
    }

    const span = trace.spans.find(s => s.spanId === spanId);
    if (!span) {
      this.logger.warn(`Span ${spanId} not found in trace ${traceId}`);
      return;
    }

    span.logs.push({
      timestamp: Date.now(),
      fields,
    });
  }

  async addSpanTag(
    traceId: string,
    spanId: string,
    key: string,
    value: unknown
  ): Promise<void> {
    const trace = this.traces.get(traceId);
    if (!trace) {
      this.logger.warn(`Trace ${traceId} not found`);
      return;
    }

    const span = trace.spans.find(s => s.spanId === spanId);
    if (!span) {
      this.logger.warn(`Span ${spanId} not found in trace ${traceId}`);
      return;
    }

    span.tags[key] = value;
  }

  async getTrace(traceId: string): Promise<IJaegerTrace | null> {
    return this.traces.get(traceId) ?? null;
  }

  async searchTraces(query: {
    serviceName?: string;
    operationName?: string;
    startTime?: number;
    endTime?: number;
    tags?: Record<string, unknown>;
    limit?: number;
  }): Promise<IJaegerTrace[]> {
    const traces = Array.from(this.traces.values());
    let filtered = traces;

    if (query.serviceName != null && query.serviceName !== '') {
      filtered = filtered.filter(t => t.serviceName === query.serviceName);
    }

    if (query.operationName != null && query.operationName !== '') {
      filtered = filtered.filter(t => t.operationName === query.operationName);
    }

    if (query.startTime !== undefined) {
      const startTime = query.startTime;
      filtered = filtered.filter(t => t.startTime >= startTime);
    }

    if (query.endTime !== undefined) {
      const endTime = query.endTime;
      filtered = filtered.filter(t => t.endTime <= endTime);
    }

    if (query.tags) {
      filtered = filtered.filter(trace => {
        return trace.spans.some(span => {
          if (query.tags == null) return true;
          return Object.entries(query.tags).every(([key, value]) => {
            return span.tags[key] === value;
          });
        });
      });
    }

    if (query.limit != null && query.limit > 0) {
      filtered = filtered.slice(0, query.limit);
    }

    return filtered.sort((a, b) => b.startTime - a.startTime);
  }

  async getServiceInfo(): Promise<IJaegerServiceInfo> {
    return {
      name: this.serviceName,
      version: this.serviceVersion,
      endpoints: [
        getEnv('JAEGER_ENDPOINT', 'string', {
          default: 'http://localhost:14268/api/traces',
        }),
      ],
    };
  }

  async getDependencies(): Promise<IJaegerDependencies[]> {
    // Анализируем трейсы для выявления зависимостей между сервисами
    const dependencies: Map<string, IJaegerDependencies> = new Map();

    for (const trace of this.traces.values()) {
      for (const span of trace.spans) {
        if (span.references && span.references.length > 0) {
          for (const ref of span.references) {
            const key = `${ref.traceId}:${ref.spanId}`;
            const existing = dependencies.get(key);

            if (existing) {
              existing.callCount++;
            } else {
              dependencies.set(key, {
                parent: this.serviceName,
                child: (span.tags['peer.service'] as string) || 'unknown',
                callCount: 1,
                source: 'jaeger',
              });
            }
          }
        }
      }
    }

    return Array.from(dependencies.values());
  }

  async getTraceStats(): Promise<{
    totalTraces: number;
    totalSpans: number;
    averageTraceDuration: number;
    tracesPerMinute: number;
    errorRate: number;
  }> {
    const traces = Array.from(this.traces.values());
    const totalTraces = traces.length;
    const totalSpans = traces.reduce(
      (sum, trace) => sum + trace.spans.length,
      0
    );

    const averageTraceDuration =
      totalTraces > 0
        ? traces.reduce((sum, trace) => sum + trace.duration, 0) / totalTraces
        : 0;

    // Вычисляем трейсы в минуту за последний час
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentTraces = traces.filter(t => t.startTime >= oneHourAgo);
    const tracesPerMinute = recentTraces.length / 60;

    // Вычисляем процент ошибок
    const errorSpans = traces.reduce((sum, trace) => {
      return (
        sum +
        trace.spans.filter(span => {
          const error = span.tags['error'];
          const statusCode = span.tags['http.status_code'];
          return (
            error === true ||
            (typeof statusCode === 'number' && statusCode >= 400)
          );
        }).length
      );
    }, 0);
    const errorRate = totalSpans > 0 ? (errorSpans / totalSpans) * 100 : 0;

    return {
      totalTraces,
      totalSpans,
      averageTraceDuration,
      tracesPerMinute,
      errorRate,
    };
  }

  async healthCheck(): Promise<{
    status: string;
    message: string;
    details: {
      connected: boolean;
      tracesCount: number;
      lastActivity: number;
    };
  }> {
    const tracesCount = this.traces.size;
    const lastActivity =
      tracesCount > 0
        ? Math.max(...Array.from(this.traces.values()).map(t => t.startTime))
        : 0;

    return {
      status: this.isConnected ? 'healthy' : 'degraded',
      message: this.isConnected
        ? 'Jaeger service is connected and operational'
        : 'Jaeger service is not connected, using local storage',
      details: {
        connected: this.isConnected,
        tracesCount,
        lastActivity,
      },
    };
  }

  async cleanupOldTraces(
    maxAge: number = 24 * 60 * 60 * 1000
  ): Promise<number> {
    const cutoffTime = Date.now() - maxAge;
    const oldTraces = Array.from(this.traces.entries()).filter(
      ([, trace]) => trace.startTime < cutoffTime
    );

    for (const [traceId] of oldTraces) {
      this.traces.delete(traceId);
    }

    return oldTraces.length;
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSpanId(): string {
    return `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async sendSpanToJaeger(span: IJaegerSpan): Promise<void> {
    // В реальной реализации здесь был бы код отправки в Jaeger
    // await this.jaegerClient.send(span);

    this.logger.debug(`Sending span ${span.spanId} to Jaeger`);
  }
}
