import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerModule } from '@nestjs/throttler';
import { RedisModule } from '../redis/redis.module';
import { CircuitBreakerService } from './circuit-breaker.service';
import { DynamicScalingController } from './dynamic-scaling.controller';
import { DynamicScalingService } from './dynamic-scaling.service';
import { GatewayController } from './gateway.controller';
import { UnifiedApiGatewayController } from './unified-api-gateway.controller';
import { GatewayService } from './gateway.service';
import { UnifiedApiGatewayService } from './unified-api-gateway.service';
import { IncidentSimulationController } from './incident-simulation.controller';
import { IncidentSimulationService } from './incident-simulation.service';
import { LoadBalancerService } from './load-balancer.service';
import { RateLimitService } from './rate-limit.service';
import { ServiceDiscoveryService } from './service-discovery.service';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 минута
        limit: 100, // 100 запросов в минуту
      },
      {
        ttl: 3600000, // 1 час
        limit: 1000, // 1000 запросов в час
      },
    ]),
    TerminusModule,
    ScheduleModule.forRoot(),
  ],
  providers: [
    GatewayService,
    UnifiedApiGatewayService,
    CircuitBreakerService,
    RateLimitService,
    LoadBalancerService,
    ServiceDiscoveryService,
    IncidentSimulationService,
    DynamicScalingService,
  ],
  controllers: [
    GatewayController,
    UnifiedApiGatewayController,
    IncidentSimulationController,
    DynamicScalingController,
  ],
  exports: [
    GatewayService,
    UnifiedApiGatewayService,
    CircuitBreakerService,
    RateLimitService,
    LoadBalancerService,
    ServiceDiscoveryService,
    IncidentSimulationService,
    DynamicScalingService,
  ],
})
export class GatewayModule {}
