import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Logger,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CircuitBreakerService } from './circuit-breaker.service';
import { GatewayService } from './gateway.service';
import {
  LoadBalancerService,
  LoadBalancingAlgorithm,
} from './load-balancer.service';
import { RateLimitService } from './rate-limit.service';
import { ServiceDiscoveryService } from './service-discovery.service';

@ApiTags('gateway')
@Controller('gateway')
export class GatewayController {
  private readonly logger = new Logger(GatewayController.name);

  constructor(
    private readonly gatewayService: GatewayService,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly rateLimitService: RateLimitService,
    private readonly loadBalancerService: LoadBalancerService,
    private readonly serviceDiscoveryService: ServiceDiscoveryService
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Проверка здоровья Gateway' })
  @ApiResponse({ status: 200, description: 'Gateway здоров' })
  async getHealth() {
    return this.gatewayService.healthCheck();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Получить статистику Gateway' })
  @ApiResponse({ status: 200, description: 'Статистика Gateway' })
  async getStats() {
    return this.gatewayService.getStats();
  }

  // API Key Management
  @Get('api-keys')
  @ApiOperation({ summary: 'Получить все API ключи' })
  @ApiResponse({ status: 200, description: 'Список API ключей' })
  async getApiKeys() {
    return this.gatewayService.getAllApiKeys();
  }

  @Post('api-keys')
  @ApiOperation({ summary: 'Добавить новый API ключ' })
  @ApiResponse({ status: 201, description: 'API ключ добавлен' })
  async addApiKey(
    @Body()
    apiKey: {
      name: string;
      key: string;
      permissions: string[];
      rateLimit: { perMinute: number; perHour: number };
      active: boolean;
    }
  ) {
    const success = this.gatewayService.addApiKey(apiKey);
    return { success };
  }

  @Delete('api-keys/:key')
  @ApiOperation({ summary: 'Деактивировать API ключ' })
  @ApiParam({ name: 'key', description: 'API ключ' })
  @ApiResponse({ status: 200, description: 'API ключ деактивирован' })
  async deactivateApiKey(@Param('key') key: string) {
    const success = this.gatewayService.deactivateApiKey(key);
    return { success };
  }

  // Rate Limiting
  @Get('rate-limit/:key')
  @ApiOperation({ summary: 'Проверить rate limit для ключа' })
  @ApiParam({ name: 'key', description: 'API ключ или IP' })
  @ApiQuery({ name: 'type', description: 'Тип проверки (api-key, ip, user)' })
  @ApiResponse({ status: 200, description: 'Информация о rate limit' })
  async checkRateLimit(
    @Param('key') key: string,
    @Query('type') type: string = 'api-key'
  ) {
    switch (type) {
      case 'api-key': {
        return this.rateLimitService.checkApiKeyRateLimit(key);
      }
      case 'ip': {
        return this.rateLimitService.checkIpRateLimit(key);
      }
      case 'user': {
        return this.rateLimitService.checkUserRateLimit(key);
      }
      default: {
        return this.rateLimitService.checkApiKeyRateLimit(key);
      }
    }
  }

  @Get('rate-limit/:key/stats')
  @ApiOperation({ summary: 'Получить статистику rate limit' })
  @ApiParam({ name: 'key', description: 'API ключ или IP' })
  @ApiResponse({ status: 200, description: 'Статистика rate limit' })
  async getRateLimitStats(@Param('key') key: string) {
    return this.rateLimitService.getRateLimitStats(key);
  }

  @Delete('rate-limit/:key/reset')
  @ApiOperation({ summary: 'Сбросить rate limit для ключа' })
  @ApiParam({ name: 'key', description: 'API ключ или IP' })
  @ApiResponse({ status: 200, description: 'Rate limit сброшен' })
  async resetRateLimit(@Param('key') key: string) {
    const success = await this.rateLimitService.resetRateLimit(key);
    return { success };
  }

  // Circuit Breaker
  @Get('circuit-breaker/:service')
  @ApiOperation({ summary: 'Получить статистику circuit breaker' })
  @ApiParam({ name: 'service', description: 'Название сервиса' })
  @ApiResponse({ status: 200, description: 'Статистика circuit breaker' })
  async getCircuitBreakerStats(@Param('service') _service: string) {
    return this.gatewayService.getCircuitBreakerStats(_service);
  }

  @Post('circuit-breaker/:service/reset')
  @ApiOperation({ summary: 'Сбросить circuit breaker для сервиса' })
  @ApiParam({ name: 'service', description: 'Название сервиса' })
  @ApiResponse({ status: 200, description: 'Circuit breaker сброшен' })
  async resetCircuitBreaker(@Param('service') _service: string) {
    const success = await this.gatewayService.resetCircuitBreaker(_service);
    return { success };
  }

  @Get('circuit-breaker/stats')
  @ApiOperation({ summary: 'Получить статистику всех circuit breakers' })
  @ApiResponse({ status: 200, description: 'Статистика всех circuit breakers' })
  async getAllCircuitBreakerStats() {
    const stats = this.circuitBreakerService.getAllStats();
    return Array.from(stats.entries()).map(([name, stat]) => ({
      name,
      ...stat,
    }));
  }

  // Load Balancer
  @Get('load-balancer/services')
  @ApiOperation({ summary: 'Получить список всех сервисов' })
  @ApiResponse({ status: 200, description: 'Список сервисов' })
  async getServices() {
    return this.loadBalancerService.getAllServices();
  }

  @Get('load-balancer/:service/health')
  @ApiOperation({ summary: 'Получить здоровье сервиса' })
  @ApiParam({ name: 'service', description: 'Название сервиса' })
  @ApiResponse({ status: 200, description: 'Здоровье сервиса' })
  async getServiceHealth(@Param('service') _service: string) {
    return this.gatewayService.getServiceHealth(_service);
  }

  @Get('load-balancer/:service/stats')
  @ApiOperation({ summary: 'Получить статистику сервиса' })
  @ApiParam({ name: 'service', description: 'Название сервиса' })
  @ApiResponse({ status: 200, description: 'Статистика сервиса' })
  async getServiceStats(@Param('service') _service: string) {
    return this.loadBalancerService.getServiceStats(_service);
  }

  @Post('load-balancer/:service/register')
  @ApiOperation({ summary: 'Зарегистрировать сервис' })
  @ApiParam({ name: 'service', description: 'Название сервиса' })
  @ApiResponse({ status: 201, description: 'Сервис зарегистрирован' })
  async registerService(
    @Param('service') _service: string,
    @Body() instances: Array<{ id: string; url: string; weight?: number }>
  ) {
    const success = await this.gatewayService.registerService(
      _service,
      instances
    );
    return { success };
  }

  // Service Discovery
  @Get('service-discovery/services')
  @ApiOperation({ summary: 'Получить все зарегистрированные сервисы' })
  @ApiResponse({ status: 200, description: 'Список сервисов' })
  async getRegisteredServices() {
    return this.serviceDiscoveryService.getAllServices();
  }

  @Get('service-discovery/services/:name')
  @ApiOperation({ summary: 'Получить сервисы по имени' })
  @ApiParam({ name: 'name', description: 'Название сервиса' })
  @ApiResponse({ status: 200, description: 'Сервисы с указанным именем' })
  async getServicesByName(@Param('name') name: string) {
    return this.serviceDiscoveryService.getServicesByName(name);
  }

  @Get('service-discovery/stats')
  @ApiOperation({ summary: 'Получить статистику service discovery' })
  @ApiResponse({ status: 200, description: 'Статистика service discovery' })
  async getServiceDiscoveryStats() {
    return this.serviceDiscoveryService.getStats();
  }

  @Post('service-discovery/sync-kong')
  @ApiOperation({ summary: 'Синхронизировать с Kong Admin API' })
  @ApiResponse({ status: 200, description: 'Синхронизация завершена' })
  async syncWithKong() {
    return this.gatewayService.syncWithKong();
  }

  // Request Routing (Demo)
  @Post('route/:service/*')
  @ApiOperation({ summary: 'Маршрутизация запроса к сервису' })
  @ApiParam({ name: 'service', description: 'Название сервиса' })
  @ApiHeader({ name: 'X-API-Key', description: 'API ключ' })
  @ApiResponse({ status: 200, description: 'Ответ от сервиса' })
  @Throttle({ default: { ttl: 60000, limit: 100 } }) // 100 запросов в минуту
  async routeRequest(
    @Param('service') _service: string | undefined,
    @Headers('x-api-key') apiKey: string | undefined,
    @Headers('x-forwarded-for') clientIp: string | undefined,
    @Body() body: Record<string, unknown>
  ) {
    if (_service == null || _service === '' || _service.length === 0) {
      return { success: false, error: 'Service parameter is required' };
    }

    if (apiKey == null || apiKey === '' || apiKey.length === 0) {
      return { success: false, error: 'API key is required' };
    }

    // Проверяем API ключ
    const keyValidation = await this.gatewayService.validateApiKey(apiKey);
    if (!keyValidation) {
      return { success: false, error: 'Invalid API key' };
    }

    // Проверяем rate limit
    const rateLimit = await this.gatewayService.checkRateLimit(
      apiKey,
      clientIp
    );
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: 'Rate limit exceeded',
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime,
      };
    }

    // Маршрутизируем запрос
    const result = await this.gatewayService.routeRequest(
      _service,
      '/demo',
      'POST',
      { 'X-API-Key': apiKey },
      body
    );

    return result;
  }

  // Health Checks для всех компонентов
  @Get('health/circuit-breaker')
  @ApiOperation({ summary: 'Проверка здоровья Circuit Breaker' })
  @ApiResponse({ status: 200, description: 'Состояние Circuit Breaker' })
  async getCircuitBreakerHealth() {
    return this.circuitBreakerService.healthCheck();
  }

  @Get('health/rate-limit')
  @ApiOperation({ summary: 'Проверка здоровья Rate Limiting' })
  @ApiResponse({ status: 200, description: 'Состояние Rate Limiting' })
  async getRateLimitHealth() {
    return this.rateLimitService.healthCheck();
  }

  @Get('health/load-balancer')
  @ApiOperation({ summary: 'Проверка здоровья Load Balancer' })
  @ApiResponse({ status: 200, description: 'Состояние Load Balancer' })
  async getLoadBalancerHealth() {
    return this.loadBalancerService.healthCheck();
  }

  @Get('health/service-discovery')
  @ApiOperation({ summary: 'Проверка здоровья Service Discovery' })
  @ApiResponse({ status: 200, description: 'Состояние Service Discovery' })
  async getServiceDiscoveryHealth() {
    return this.serviceDiscoveryService.healthCheck();
  }

  // Demo endpoints для тестирования
  @Post('demo/circuit-breaker-test')
  @ApiOperation({ summary: 'Тест Circuit Breaker' })
  @ApiResponse({ status: 200, description: 'Результат теста' })
  async testCircuitBreaker(@Body() body: Record<string, unknown>) {
    try {
      const { service, shouldFail = false } = body;

      if (shouldFail === true) {
        return {
          error: 'Simulated failure',
          timestamp: new Date(),
          service: service,
          shouldFail: shouldFail,
        };
      }

      return {
        message: 'Success',
        timestamp: new Date(),
        service: service,
        shouldFail: shouldFail,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Circuit breaker test failed: ${errorMessage}`);
      return {
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  @Post('demo/rate-limit-test')
  @ApiOperation({ summary: 'Тест Rate Limiting' })
  @ApiResponse({ status: 200, description: 'Результат теста' })
  async testRateLimit(@Body() body: { key: string; type?: string }) {
    const { key, type = 'api-key' } = body;

    let result;
    switch (type) {
      case 'api-key': {
        result = await this.rateLimitService.checkApiKeyRateLimit(key);
        break;
      }
      case 'ip': {
        result = await this.rateLimitService.checkIpRateLimit(key);
        break;
      }
      case 'user': {
        result = await this.rateLimitService.checkUserRateLimit(key);
        break;
      }
      default: {
        result = await this.rateLimitService.checkApiKeyRateLimit(key);
      }
    }

    return {
      key,
      type,
      ...result,
    };
  }

  @Post('demo/load-balancer-test')
  @ApiOperation({ summary: 'Тест Load Balancer' })
  @ApiResponse({ status: 200, description: 'Результат теста' })
  async testLoadBalancer(
    @Body() body: { _service: string; algorithm?: string }
  ) {
    const { _service: service, algorithm = 'round-robin' } = body;

    // Проверяем что algorithm валидный
    const validAlgorithms: LoadBalancingAlgorithm[] = [
      LoadBalancingAlgorithm.ROUND_ROBIN,
      LoadBalancingAlgorithm.LEAST_CONNECTIONS,
      LoadBalancingAlgorithm.WEIGHTED,
      LoadBalancingAlgorithm.IP_HASH,
    ];
    const validAlgorithm = validAlgorithms.includes(
      algorithm as LoadBalancingAlgorithm
    )
      ? (algorithm as LoadBalancingAlgorithm)
      : LoadBalancingAlgorithm.ROUND_ROBIN;

    const instance = await this.loadBalancerService.getNextInstance(
      service,
      validAlgorithm
    );

    return {
      service,
      algorithm,
      instance: instance
        ? {
            id: instance.id,
            url: instance.url,
            health: instance.health,
            weight: instance.weight,
          }
        : null,
    };
  }
}
