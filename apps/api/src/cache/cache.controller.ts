import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import type { ICacheStats } from './cache.service';
import { CacheService } from './cache.service';

interface ICacheSetDto {
  key: string;
  value: unknown;
  ttl?: number;
}

interface ICacheDeletePatternDto {
  pattern: string;
}

@ApiTags('cache')
@Controller('cache')
// @UseGuards(JwtAuthGuard) // Временно отключен для тестирования
// @ApiBearerAuth()
export class CacheController {
  constructor(private readonly cacheService: CacheService) {}

  @Get('health')
  @ApiOperation({ summary: 'Проверка здоровья Redis' })
  @ApiResponse({ status: 200, description: 'Redis здоров' })
  @ApiResponse({ status: 503, description: 'Redis недоступен' })
  async healthCheck() {
    return this.cacheService.healthCheck();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Получить статистику кеша' })
  @ApiResponse({ status: 200, description: 'Статистика кеша' })
  async getStats(): Promise<ICacheStats> {
    return this.cacheService.getStats();
  }

  @Get('performance')
  @ApiOperation({ summary: 'Получить метрики производительности' })
  @ApiResponse({ status: 200, description: 'Метрики производительности' })
  async getPerformanceMetrics() {
    return this.cacheService.getPerformanceMetrics();
  }

  @Get(':key')
  @ApiOperation({ summary: 'Получить значение из кеша' })
  @ApiParam({ name: 'key', description: 'Ключ кеша' })
  @ApiResponse({ status: 200, description: 'Значение найдено' })
  @ApiResponse({ status: 404, description: 'Значение не найдено' })
  async get(@Param('key') key: string) {
    const value = await this.cacheService.get(key);
    if (value === null) {
      return { message: 'Key not found', key };
    }
    return { key, value };
  }

  @Get(':key/ttl')
  @ApiOperation({ summary: 'Получить TTL ключа' })
  @ApiParam({ name: 'key', description: 'Ключ кеша' })
  @ApiResponse({ status: 200, description: 'TTL ключа' })
  async getTTL(@Param('key') key: string) {
    const ttl = await this.cacheService.getTTL(key);
    return { key, ttl };
  }

  @Post('set')
  @ApiOperation({ summary: 'Установить значение в кеш' })
  @ApiResponse({ status: 201, description: 'Значение установлено' })
  async set(@Body() dto: ICacheSetDto) {
    await this.cacheService.set(dto.key, dto.value, dto.ttl);
    return { message: 'Value set successfully', key: dto.key };
  }

  @Put(':key/ttl')
  @ApiOperation({ summary: 'Установить TTL для ключа' })
  @ApiParam({ name: 'key', description: 'Ключ кеша' })
  @ApiQuery({ name: 'ttl', description: 'TTL в секундах', type: Number })
  @ApiResponse({ status: 200, description: 'TTL установлен' })
  async setTTL(@Param('key') key: string, @Query('ttl') ttl: number) {
    const success = await this.cacheService.setTTL(key, ttl);
    return { key, ttl, success };
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Удалить ключ из кеша' })
  @ApiParam({ name: 'key', description: 'Ключ кеша' })
  @ApiResponse({ status: 200, description: 'Ключ удален' })
  async delete(@Param('key') key: string) {
    await this.cacheService.delete(key);
    return { message: 'Key deleted successfully', key };
  }

  @Delete('pattern')
  @ApiOperation({ summary: 'Удалить ключи по паттерну' })
  @ApiResponse({ status: 200, description: 'Ключи удалены' })
  async deleteByPattern(@Body() dto: ICacheDeletePatternDto) {
    const deleted = await this.cacheService.deleteByPattern(dto.pattern);
    return {
      message: 'Keys deleted successfully',
      pattern: dto.pattern,
      deleted,
    };
  }

  @Delete('clear/all')
  @ApiOperation({ summary: 'Очистить весь кеш' })
  @ApiResponse({ status: 200, description: 'Кеш очищен' })
  async clear() {
    await this.cacheService.clear();
    return { message: 'Cache cleared successfully' };
  }

  // Тестовые endpoints для демонстрации
  @Post('test/set-demo')
  @ApiOperation({ summary: 'Установить демо данные в кеш' })
  @ApiResponse({ status: 201, description: 'Демо данные установлены' })
  async setDemoData() {
    const demoData = {
      users: [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
      ],
      cards: [
        { id: 'card-1', name: 'Скидка 10%', discount: 10 },
        { id: 'card-2', name: 'Скидка 15%', discount: 15 },
      ],
      timestamp: new Date().toISOString(),
    };

    await this.cacheService.set('demo:data', demoData, 3600); // 1 час
    await this.cacheService.set('demo:users', demoData.users, 1800); // 30 минут
    await this.cacheService.set('demo:cards', demoData.cards, 7200); // 2 часа

    return {
      message: 'Demo data set successfully',
      keys: ['demo:data', 'demo:users', 'demo:cards'],
    };
  }

  @Get('test/get-demo')
  @ApiOperation({ summary: 'Получить демо данные из кеша' })
  @ApiResponse({ status: 200, description: 'Демо данные' })
  async getDemoData() {
    const data = await this.cacheService.get('demo:data');
    const users = await this.cacheService.get('demo:users');
    const cards = await this.cacheService.get('demo:cards');

    return {
      data,
      users,
      cards,
      cacheStats: await this.cacheService.getStats(),
    };
  }
}
