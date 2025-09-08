import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CdnService } from './cdn.service';
import { CdnController } from './cdn.controller';

@Module({
  imports: [ConfigModule],
  providers: [CdnService],
  controllers: [CdnController],
  exports: [CdnService],
})
export class CdnModule {}
