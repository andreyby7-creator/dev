import { Module } from '@nestjs/common';
import { ConfigSnapshotTestingService } from './config-snapshot-testing.service';
import { EnvSchemaGeneratorService } from './env-schema-generator.service';
import { FeatureFlagsController } from './feature-flags.controller';
import { FeatureFlagsService } from './feature-flags.service';
import { TestFixturesService } from './test-fixtures.service';

@Module({
  providers: [
    FeatureFlagsService,
    ConfigSnapshotTestingService,
    TestFixturesService,
    EnvSchemaGeneratorService,
  ],
  controllers: [FeatureFlagsController],
  exports: [
    FeatureFlagsService,
    ConfigSnapshotTestingService,
    TestFixturesService,
    EnvSchemaGeneratorService,
  ],
})
export class FeatureFlagsModule {}
