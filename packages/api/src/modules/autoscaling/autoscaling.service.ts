import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutoscalingHistory } from './autoscaling-history.entity';
import { AutoscalingConfig } from './autoscaling-config.entity';
import { MetricsService } from '../metrics/metrics.service';
import { ScalingDecision } from './interfaces/scaling-decision.interface';
import { ScalingMetrics } from './interfaces/scaling-metrics.interface';
import { ScalingAction } from './enums/scaling-action.enum';
import { ScalingTrigger } from './enums/scaling-trigger.enum';
import { ScalingResult } from './enums/scaling-result.enum';

@Injectable()
export class AutoscalingService {
  private readonly logger = new Logger(AutoscalingService.name);

  constructor(
    @InjectRepository(AutoscalingHistory)
    private readonly historyRepository: Repository<AutoscalingHistory>,
    @InjectRepository(AutoscalingConfig)
    private readonly configRepository: Repository<AutoscalingConfig>,
    private readonly metricsService: MetricsService
  ) {}

  /**
   * Основной метод для принятия решения об автомасштабировании
   */
  async makeScalingDecision(
    serviceId: string,
    currentMetrics: ScalingMetrics
  ): Promise<ScalingDecision> {
    try {
      // Получаем конфигурацию автомасштабирования для сервиса
      const config = await this.getAutoscalingConfig(serviceId);
      if (!config) {
        this.logger.warn(
          `No autoscaling config found for service: ${serviceId}`
        );
        return {
          action: ScalingAction.NO_ACTION,
          reason: 'No autoscaling configuration found',
          confidence: 0,
          timestamp: new Date(),
        };
      }

      // Анализируем метрики и принимаем решение
      const decision = this.analyzeMetricsAndDecide(config, currentMetrics);

      // Логируем решение
      this.logger.log(
        `Scaling decision for ${serviceId}: ${decision.action} - ${decision.reason}`
      );

      // Сохраняем историю решения
      await this.saveScalingDecision(serviceId, decision, currentMetrics);

      return decision;
    } catch (error) {
      this.logger.error(
        `Error making scaling decision: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Анализирует метрики и принимает решение об автомасштабировании
   */
  private analyzeMetricsAndDecide(
    config: AutoscalingConfig,
    metrics: ScalingMetrics
  ): ScalingDecision {
    const {
      cpuThreshold,
      memoryThreshold,
      responseTimeThreshold,
      minInstances,
      maxInstances,
    } = config;

    // Проверяем CPU
    if (metrics.cpuUsage > cpuThreshold) {
      return {
        action: ScalingAction.SCALE_UP,
        reason: `CPU usage ${metrics.cpuUsage}% exceeds threshold ${cpuThreshold}%`,
        confidence: this.calculateConfidence(metrics.cpuUsage, cpuThreshold),
        timestamp: new Date(),
      };
    }

    // Проверяем память
    if (metrics.memoryUsage > memoryThreshold) {
      return {
        action: ScalingAction.SCALE_UP,
        reason: `Memory usage ${metrics.memoryUsage}% exceeds threshold ${memoryThreshold}%`,
        confidence: this.calculateConfidence(
          metrics.memoryUsage,
          memoryThreshold
        ),
        timestamp: new Date(),
      };
    }

    // Проверяем время ответа
    if (metrics.responseTime > responseTimeThreshold) {
      return {
        action: ScalingAction.SCALE_UP,
        reason: `Response time ${metrics.responseTime}ms exceeds threshold ${responseTimeThreshold}ms`,
        confidence: this.calculateConfidence(
          metrics.responseTime,
          responseTimeThreshold
        ),
        timestamp: new Date(),
      };
    }

    // Проверяем возможность масштабирования вниз
    if (metrics.currentInstances > minInstances) {
      // Проверяем, что все метрики ниже порогов для масштабирования вниз
      const scaleDownThreshold = 0.7; // 70% от порога масштабирования вверх

      if (
        metrics.cpuUsage < cpuThreshold * scaleDownThreshold &&
        metrics.memoryUsage < memoryThreshold * scaleDownThreshold &&
        metrics.responseTime < responseTimeThreshold * scaleDownThreshold
      ) {
        return {
          action: ScalingAction.SCALE_DOWN,
          reason: `All metrics below scale-down threshold (70% of scale-up threshold)`,
          confidence: this.calculateConfidence(
            Math.max(
              metrics.cpuUsage,
              metrics.memoryUsage,
              metrics.responseTime
            ),
            Math.max(cpuThreshold, memoryThreshold, responseTimeThreshold) *
              scaleDownThreshold
          ),
          timestamp: new Date(),
        };
      }
    }

    return {
      action: ScalingAction.NO_ACTION,
      reason: 'All metrics within acceptable ranges',
      confidence: 1.0,
      timestamp: new Date(),
    };
  }

  /**
   * Вычисляет уверенность в решении на основе отклонения от порога
   */
  private calculateConfidence(actual: number, threshold: number): number {
    const deviation = Math.abs(actual - threshold) / threshold;
    return Math.min(deviation, 1.0); // Ограничиваем уверенность до 1.0
  }

  /**
   * Сохраняет решение об автомасштабировании в историю
   */
  private async saveScalingDecision(
    serviceId: string,
    decision: ScalingDecision,
    metrics: ScalingMetrics
  ): Promise<void> {
    try {
      // Получаем или создаем запись истории для сервиса
      let history = await this.historyRepository.findOne({
        where: { serviceId },
      });

      if (!history) {
        history = this.historyRepository.create({
          serviceId,
          totalScalingEvents: 0,
          totalScaleUps: 0,
          totalScaleDowns: 0,
          lastScalingEvent: new Date(),
        });
      }

      // Обновляем статистику
      if (history) {
        // Инициализируем счетчики если они undefined
        history.totalScalingEvents ??= 0;
        history.totalScalingEvents += 1;

        if (decision.action === ScalingAction.SCALE_UP) {
          history.totalScaleUps ??= 0;
          history.totalScaleUps += 1;
          history.lastScaleUp = new Date();
        } else if (decision.action === ScalingAction.SCALE_DOWN) {
          history.totalScaleDowns ??= 0;
          history.totalScaleDowns += 1;
          history.lastScaleDown = new Date();
        }

        // Обновляем время последнего события
        history.lastScalingEvent = new Date();
      }

      // Сохраняем обновленную историю
      await this.historyRepository.save(history);

      // Создаем детальную запись о событии
      const eventRecord = this.historyRepository.create({
        serviceId,
        action: decision.action,
        reason: decision.reason,
        confidence: decision.confidence,
        trigger: ScalingTrigger.AUTOMATIC,
        result: ScalingResult.SUCCESS,
        metrics: {
          cpuUsage: metrics.cpuUsage,
          memoryUsage: metrics.memoryUsage,
          responseTime: metrics.responseTime,
          currentInstances: metrics.currentInstances,
        },
        timestamp: decision.timestamp,
      });

      await this.historyRepository.save(eventRecord);

      this.logger.log(`Scaling decision saved for service: ${serviceId}`);
    } catch (error) {
      this.logger.error(
        `Error saving scaling decision: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Получает конфигурацию автомасштабирования для сервиса
   */
  private async getAutoscalingConfig(
    serviceId: string
  ): Promise<AutoscalingConfig | null> {
    try {
      return await this.configRepository.findOne({
        where: { serviceId },
      });
    } catch (error) {
      this.logger.error(
        `Error getting autoscaling config: ${error.message}`,
        error.stack
      );
      return null;
    }
  }

  /**
   * Получает историю автомасштабирования для сервиса
   */
  async getScalingHistory(serviceId: string): Promise<AutoscalingHistory[]> {
    try {
      return await this.historyRepository.find({
        where: { serviceId },
        order: { timestamp: 'DESC' },
        take: 100, // Ограничиваем последними 100 событиями
      });
    } catch (error) {
      this.logger.error(
        `Error getting scaling history: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Получает статистику автомасштабирования для сервиса
   */
  async getScalingStats(serviceId: string): Promise<{
    totalEvents: number;
    totalScaleUps: number;
    totalScaleDowns: number;
    lastEvent: Date | null;
    lastScaleUp: Date | null;
    lastScaleDown: Date | null;
  }> {
    try {
      const history = await this.historyRepository.findOne({
        where: { serviceId },
      });

      if (!history) {
        return {
          totalEvents: 0,
          totalScaleUps: 0,
          totalScaleDowns: 0,
          lastEvent: null,
          lastScaleUp: null,
          lastScaleDown: null,
        };
      }

      return {
        totalEvents: history.totalScalingEvents ?? 0,
        totalScaleUps: history.totalScaleUps ?? 0,
        totalScaleDowns: history.totalScaleDowns ?? 0,
        lastEvent: history.lastScalingEvent ?? null,
        lastScaleUp: history.lastScaleUp ?? null,
        lastScaleDown: history.lastScaleDown ?? null,
      };
    } catch (error) {
      this.logger.error(
        `Error getting scaling stats: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Обновляет конфигурацию автомасштабирования
   */
  async updateAutoscalingConfig(
    serviceId: string,
    config: Partial<AutoscalingConfig>
  ): Promise<AutoscalingConfig> {
    try {
      let existingConfig = await this.configRepository.findOne({
        where: { serviceId },
      });

      if (existingConfig) {
        // Обновляем существующую конфигурацию
        Object.assign(existingConfig, config);
        return await this.configRepository.save(existingConfig);
      } else {
        // Создаем новую конфигурацию
        const newConfig = this.configRepository.create({
          serviceId,
          ...config,
        });
        return await this.configRepository.save(newConfig);
      }
    } catch (error) {
      this.logger.error(
        `Error updating autoscaling config: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Удаляет конфигурацию автомасштабирования
   */
  async deleteAutoscalingConfig(serviceId: string): Promise<void> {
    try {
      await this.configRepository.delete({ serviceId });
      this.logger.log(`Autoscaling config deleted for service: ${serviceId}`);
    } catch (error) {
      this.logger.error(
        `Error deleting autoscaling config: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}
