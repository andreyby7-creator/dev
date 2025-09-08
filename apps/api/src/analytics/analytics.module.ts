import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BusinessIntelligenceService } from './business-intelligence.service';
import { UserAnalyticsService } from './user-analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [ConfigModule, EventEmitterModule],
  providers: [BusinessIntelligenceService, UserAnalyticsService],
  controllers: [AnalyticsController],
  exports: [BusinessIntelligenceService, UserAnalyticsService],
})
export class AnalyticsModule {}
