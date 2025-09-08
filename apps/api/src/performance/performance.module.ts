import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PerformanceOptimizationService } from './performance-optimization.service';
import { AutoScalingService } from './auto-scaling.service';
import { PerformanceController } from './performance.controller';

@Module({
  imports: [ConfigModule, EventEmitterModule],
  providers: [PerformanceOptimizationService, AutoScalingService],
  controllers: [PerformanceController],
  exports: [PerformanceOptimizationService, AutoScalingService],
})
export class PerformanceModule {}
