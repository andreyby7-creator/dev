import type { OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';

export interface ITraceSpan {
  traceId: string;
  spanId: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  context?: Record<string, unknown>;
  result?: Record<string, unknown>;
  status: 'active' | 'completed' | 'error';
}

@Injectable()
export class TracingService implements OnModuleInit {
  private traces: Map<string, ITraceSpan> = new Map();
  private maxTraces = 1000; // Keep last 1k traces in memory

  async onModuleInit() {
    await this.initialize();
  }

  async initialize() {
    this.traces.clear();

    console.log('[TracingService] Initialized');
  }

  async startTrace(
    operation: string,
    context?: Record<string, unknown>
  ): Promise<string> {
    const traceId = this.generateTraceId();
    const spanId = this.generateSpanId();

    const trace: ITraceSpan = {
      traceId,
      spanId,
      operation,
      startTime: Date.now(),
      context: context ?? {},
      status: 'active',
    };

    this.traces.set(traceId, trace);

    // Keep only the last maxTraces
    if (this.traces.size > this.maxTraces) {
      const firstKey = this.traces.keys().next().value;
      if (firstKey != null && firstKey !== '') {
        this.traces.delete(firstKey);
      }
    }

    return traceId;
  }

  async endTrace(
    traceId: string,
    result?: Record<string, unknown>
  ): Promise<void> {
    const trace = this.traces.get(traceId);
    if (!trace) {
      throw new Error(`Trace ${traceId} not found`);
    }

    const endTime = Date.now();
    trace.endTime = endTime;
    trace.duration = endTime - trace.startTime;
    trace.result = result ?? {};
    trace.status = 'completed';

    this.traces.set(traceId, trace);
  }

  async errorTrace(traceId: string, error: Error): Promise<void> {
    const trace = this.traces.get(traceId);
    if (!trace) {
      throw new Error(`Trace ${traceId} not found`);
    }

    const endTime = Date.now();
    trace.endTime = endTime;
    trace.duration = endTime - trace.startTime;
    trace.result = {
      error: error.message,
      stack: error.stack,
    };
    trace.status = 'error';

    this.traces.set(traceId, trace);
  }

  async getTrace(traceId: string): Promise<ITraceSpan | null> {
    return this.traces.get(traceId) ?? null;
  }

  async getTraces(operation?: string, limit = 100): Promise<ITraceSpan[]> {
    let traces = Array.from(this.traces.values());

    if (operation != null && operation !== '') {
      traces = traces.filter(trace => trace.operation === operation);
    }

    return traces.slice(-limit);
  }

  async getTraceStats(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {
      total: this.traces.size,
      active: 0,
      completed: 0,
      error: 0,
    };

    this.traces.forEach(trace => {
      stats[trace.status] = (stats[trace.status] ?? 0) + 1;
    });

    return stats;
  }

  async getAverageDuration(operation?: string): Promise<number> {
    let traces = Array.from(this.traces.values());

    if (operation != null && operation !== '') {
      traces = traces.filter(trace => trace.operation === operation);
    }

    const completedTraces = traces.filter(
      trace =>
        trace.status === 'completed' &&
        trace.duration != null &&
        trace.duration > 0
    );

    if (completedTraces.length === 0) {
      return 0;
    }

    const totalDuration = completedTraces.reduce(
      (sum, trace) => sum + (trace.duration ?? 0),
      0
    );
    return totalDuration / completedTraces.length;
  }

  async clearTraces(): Promise<void> {
    this.traces.clear();
  }

  async exportTraces(format: 'json' | 'jaeger' = 'json'): Promise<string> {
    const traces = Array.from(this.traces.values());

    if (format === 'jaeger') {
      // Convert to Jaeger format
      const jaegerTraces = traces.map(trace => ({
        traceID: trace.traceId,
        spans: [
          {
            traceID: trace.traceId,
            spanID: trace.spanId,
            operationName: trace.operation,
            startTime: trace.startTime * 1000, // Convert to microseconds
            duration: (trace.duration ?? 0) * 1000,
            tags: [
              { key: 'status', value: trace.status },
              ...Object.entries(trace.context ?? {}).map(([key, value]) => ({
                key,
                value: String(value),
              })),
            ],
          },
        ],
      }));

      return JSON.stringify(jaegerTraces, null, 2);
    }

    return JSON.stringify(traces, null, 2);
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSpanId(): string {
    return `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
