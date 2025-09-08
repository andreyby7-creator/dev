import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { RedisModule } from '../redis/redis.module';
import { CacheService } from './cache.service';
import { CacheController } from './cache.controller';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 60 * 60 * 24, // 24 часа по умолчанию
      max: 1000, // максимальное количество элементов в кеше
    }),
    RedisModule,
  ],
  providers: [CacheService],
  controllers: [CacheController],
  exports: [CacheService],
})
export class AppCacheModule {}
