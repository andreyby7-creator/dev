import { Injectable, Logger } from '@nestjs/common';

export interface TraceSpan {
  id: string;
  traceId: string;
  parentId?: string;
  name: string;
  _service: string;
  operation: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'started' | 'completed' | 'error';
  tags: Record<string, string>;
  logs: Array<{
    timestamp: Date;
    message: string;
    level: 'debug' | 'info' | 'warn' | 'error';
  }>;
  metadata: Record<string, unknown>;
}

export interface Trace {
  id: string;
  name: string;
  _service: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'active' | 'completed' | 'error';
  spans: TraceSpan[];
  rootSpan?: TraceSpan;
  metadata: Record<string, unknown>;
}

export interface TraceConfig {
  _service: string;
  operation: string;
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
  samplingRate?: number;
}

@Injectable()
export class DistributedTracingService {
  private readonly logger = new Logger(DistributedTracingService.name);
  private traces: Map<string, Trace> = new Map();
  private spans: Map<string, TraceSpan> = new Map();
  private activeTraces: Set<string> = new Set();

  async startTrace(config: TraceConfig): Promise<{
    traceId: string;
    spanId: string;
    status: string;
  }> {
    try {
      this.logger.log(
        `Starting trace for service: ${config._service}, operation: ${config.operation}`
      );

      const traceId = `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const spanId = `span-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const rootSpan: TraceSpan = {
        id: spanId,
        traceId,
        name: config.operation,
        _service: config._service,
        operation: config.operation,
        startTime: new Date(),
        status: 'started',
        tags: config.tags ?? {},
        logs: [],
        metadata: config.metadata ?? {},
      };

      const trace: Trace = {
        id: traceId,
        name: config.operation,
        _service: config._service,
        startTime: new Date(),
        status: 'active',
        spans: [rootSpan],
        rootSpan,
        metadata: config.metadata ?? {},
      };

      this.traces.set(traceId, trace);
      this.spans.set(spanId, rootSpan);
      this.activeTraces.add(traceId);

      this.logger.log(`Started trace ${traceId} with root span ${spanId}`);

      return {
        traceId,
        spanId,
        status: 'started',
      };
    } catch (error) {
      this.logger.error('Failed to start trace', error);
      throw error;
    }
  }

  async getTraces(service?: string): Promise<{
    traces: Trace[];
    total: number;
    active: number;
    completed: number;
    errors: number;
  }> {
    try {
      this.logger.log(`Getting traces for service: ${service ?? 'all'}`);

      let traces = Array.from(this.traces.values());

      if (service != null) {
        traces = traces.filter(trace => trace._service === service);
      }

      // Sort by start time descending (newest first)
      traces.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

      const active = traces.filter(t => t.status === 'active').length;
      const completed = traces.filter(t => t.status === 'completed').length;
      const errors = traces.filter(t => t.status === 'error').length;

      this.logger.log(
        `Found ${traces.length} traces (${active} active, ${completed} completed, ${errors} errors)`
      );

      return {
        traces,
        total: traces.length,
        active,
        completed,
        errors,
      };
    } catch (error) {
      this.logger.error('Failed to get traces', error);
      throw error;
    }
  }

  async addSpan(
    traceId: string,
    parentId: string,
    config: TraceConfig
  ): Promise<{
    spanId: string;
    status: string;
  }> {
    try {
      this.logger.log(
        `Adding span to trace ${traceId} with parent ${parentId}`
      );

      const trace = this.traces.get(traceId);
      if (!trace) {
        throw new Error(`Trace ${traceId} not found`);
      }

      const spanId = `span-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const span: TraceSpan = {
        id: spanId,
        traceId,
        parentId,
        name: config.operation,
        _service: config._service,
        operation: config.operation,
        startTime: new Date(),
        status: 'started',
        tags: config.tags ?? {},
        logs: [],
        metadata: config.metadata ?? {},
      };

      trace.spans.push(span);
      this.spans.set(spanId, span);

      this.logger.log(`Added span ${spanId} to trace ${traceId}`);

      return {
        spanId,
        status: 'started',
      };
    } catch (error) {
      this.logger.error('Failed to add span', error);
      throw error;
    }
  }

  async finishSpan(
    spanId: string,
    status: 'completed' | 'error' = 'completed'
  ): Promise<{
    success: boolean;
    duration: number;
  }> {
    try {
      this.logger.log(`Finishing span ${spanId} with status: ${status}`);

      const span = this.spans.get(spanId);
      if (!span) {
        throw new Error(`Span ${spanId} not found`);
      }

      span.endTime = new Date();
      span.duration = span.endTime.getTime() - span.startTime.getTime();
      span.status = status;

      // Update trace status if this is the root span
      const trace = this.traces.get(span.traceId);
      if (trace && trace.rootSpan?.id === spanId) {
        trace.endTime = span.endTime;
        trace.duration = span.duration;
        trace.status = status;
        this.activeTraces.delete(span.traceId);
      }

      this.logger.log(
        `Finished span ${spanId} with duration ${span.duration}ms`
      );

      return {
        success: true,
        duration: span.duration,
      };
    } catch (error) {
      this.logger.error('Failed to finish span', error);
      throw error;
    }
  }

  async addSpanLog(
    spanId: string,
    message: string,
    level: 'debug' | 'info' | 'warn' | 'error' = 'info'
  ): Promise<{
    success: boolean;
    logCount: number;
  }> {
    try {
      this.logger.log(`Adding log to span ${spanId}`);

      const span = this.spans.get(spanId);
      if (!span) {
        throw new Error(`Span ${spanId} not found`);
      }

      span.logs.push({
        timestamp: new Date(),
        message,
        level,
      });

      this.logger.log(
        `Added log to span ${spanId}, total logs: ${span.logs.length}`
      );

      return {
        success: true,
        logCount: span.logs.length,
      };
    } catch (error) {
      this.logger.error('Failed to add span log', error);
      throw error;
    }
  }

  async getTraceDetails(traceId: string): Promise<{
    trace: Trace | null;
    spans: TraceSpan[];
    duration: number;
    status: string;
  }> {
    try {
      this.logger.log(`Getting details for trace ${traceId}`);

      const trace = this.traces.get(traceId);
      if (!trace) {
        return {
          trace: null,
          spans: [],
          duration: 0,
          status: 'not_found',
        };
      }

      const spans = trace.spans.sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime()
      );

      return {
        trace,
        spans,
        duration: trace.duration ?? 0,
        status: trace.status,
      };
    } catch (error) {
      this.logger.error('Failed to get trace details', error);
      throw error;
    }
  }

  async getTraceStatistics(timeRange?: string): Promise<{
    timeRange: string;
    totalTraces: number;
    averageDuration: number;
    errorRate: number;
    byService: Array<{
      _service: string;
      count: number;
      averageDuration: number;
      errorRate: number;
    }>;
  }> {
    try {
      this.logger.log(
        `Getting trace statistics for time range: ${timeRange ?? 'default'}`
      );

      const cutoffTime = this.getCutoffTime(timeRange ?? '24h');
      const filteredTraces = Array.from(this.traces.values()).filter(
        trace => trace.startTime >= cutoffTime && trace.status === 'completed'
      );

      const totalTraces = filteredTraces.length;
      const totalDuration = filteredTraces.reduce(
        (sum, trace) => sum + (trace.duration ?? 0),
        0
      );
      const averageDuration = totalTraces > 0 ? totalDuration / totalTraces : 0;
      const errorTraces = filteredTraces.filter(
        trace => trace.status === 'error'
      ).length;
      const errorRate = totalTraces > 0 ? (errorTraces / totalTraces) * 100 : 0;

      // Aggregate by service
      const serviceStats = new Map<
        string,
        {
          count: number;
          totalDuration: number;
          errors: number;
        }
      >();

      for (const trace of filteredTraces) {
        const stats = serviceStats.get(trace._service) ?? {
          count: 0,
          totalDuration: 0,
          errors: 0,
        };
        stats.count++;
        stats.totalDuration += trace.duration ?? 0;
        if (trace.status === 'error') {
          stats.errors++;
        }
        serviceStats.set(trace._service, stats);
      }

      const byService = Array.from(serviceStats.entries()).map(
        ([_service, stats]) => ({
          _service,
          count: stats.count,
          averageDuration:
            stats.count > 0 ? stats.totalDuration / stats.count : 0,
          errorRate: stats.count > 0 ? (stats.errors / stats.count) * 100 : 0,
        })
      );

      return {
        timeRange: timeRange ?? '24h',
        totalTraces,
        averageDuration,
        errorRate,
        byService,
      };
    } catch (error) {
      this.logger.error('Failed to get trace statistics', error);
      throw error;
    }
  }

  private getCutoffTime(timeRange: string): Date {
    const now = new Date();
    const range = timeRange.toLowerCase();

    if (range.includes('1h') || range.includes('hour')) {
      return new Date(now.getTime() - 60 * 60 * 1000);
    } else if (range.includes('24h') || range.includes('day')) {
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (range.includes('7d') || range.includes('week')) {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range.includes('30d') || range.includes('month')) {
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Default to 24 hours
    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}
