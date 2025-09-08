import { Module } from '@nestjs/common';
import { AiCodeAssistantController } from './ai-code-assistant.controller';
import { AiCodeAssistantService } from './ai-code-assistant.service';
import { DynamicTypeChecksService } from './dynamic-type-checks.service';
import { AstCodeModService } from './ast-code-mod.service';
import { AiCommitAnalyzerService } from './ai-commit-analyzer.service';
import { AiDocstringGeneratorService } from './ai-docstring-generator.service';
import { AiCodeOptimizerService } from './ai-code-optimizer.service';

@Module({
  controllers: [AiCodeAssistantController],
  providers: [
    AiCodeAssistantService,
    DynamicTypeChecksService,
    AstCodeModService,
    AiCommitAnalyzerService,
    AiDocstringGeneratorService,
    AiCodeOptimizerService,
  ],
  exports: [
    AiCodeAssistantService,
    DynamicTypeChecksService,
    AstCodeModService,
    AiCommitAnalyzerService,
    AiDocstringGeneratorService,
    AiCodeOptimizerService,
  ],
})
export class AiModule {}
