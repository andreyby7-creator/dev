import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async () => {
        // Мок Redis клиент для разработки
        const mockRedis = {
          get: async () => null,
          set: async () => 'OK',
          del: async () => 1,
          exists: async () => 0,
          expire: async () => 1,
          ttl: async () => -1,
          keys: async () => [],
          flushall: async () => 'OK',
          ping: async () => 'PONG',
          on: () => {},
          connect: async () => {},
          disconnect: async () => {},
        };

        console.log('Using mock Redis client for development');
        return mockRedis;
      },
      inject: [],
    },
    RedisService,
  ],
  exports: ['REDIS_CLIENT', RedisService],
})
export class RedisModule {}
