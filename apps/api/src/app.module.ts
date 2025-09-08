import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from './ai/ai.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AutomationModule } from './automation/automation.module';
import { AppCacheModule } from './cache/cache.module';
import { CardsModule } from './cards/cards.module';
import { ConfigurationModule } from './config/configuration.module';
import { DevOpsModule } from './devops/devops.module';
import { DisasterRecoveryModule } from './disaster-recovery/disaster-recovery.module';
import { FeatureFlagsModule } from './features/feature-flags.module';
import { GatewayModule } from './gateway/gateway.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { NetworkModule } from './network/network.module';
import { ObservabilityModule } from './observability/observability.module';
import { PerformanceModule } from './performance/performance.module';
import { RegionalArchitectureModule } from './regional-architecture/regional-architecture.module';
import { SecurityModule } from './security/security.module';
import { SupabaseModule } from './supabase/supabase.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    SupabaseModule,
    AuthModule,
    AiModule,
    CardsModule,
    ObservabilityModule,
    SecurityModule,
    DevOpsModule,
    AppCacheModule,
    FeatureFlagsModule,
    NetworkModule,
    RegionalArchitectureModule,
    AutomationModule,
    DisasterRecoveryModule,
    GatewayModule,
    ConfigurationModule,
    MonitoringModule,
    PerformanceModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
