import { Controller, Post, Get, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import type {
  ICodeGenerationRequest,
  ICodeGenerationResult,
} from './ai-code-assistant.service';
import { AiCodeAssistantService } from './ai-code-assistant.service';
import type {
  IBulkTransformationRequest,
  IBulkTransformationResult,
} from './ast-code-mod.service';
import { AstCodeModService } from './ast-code-mod.service';
import type {
  IDtoGenerationRequest,
  IGeneratedDto,
  IApiContract,
  IGeneratedApiContract,
  ITypeDefinition,
  IApiParameter,
} from './dynamic-type-checks.service';
import { DynamicTypeChecksService } from './dynamic-type-checks.service';

// DTOs
export class GenerateCodeDto implements ICodeGenerationRequest {
  type!:
    | 'BOILERPLATE'
    | 'INTERFACE'
    | 'TYPE'
    | 'DTO'
    | 'SERVICE'
    | 'CONTROLLER'
    | 'MODULE'
    | 'TEST';
  language!: 'typescript' | 'javascript' | 'json' | 'yaml';
  framework?: 'nestjs' | 'express' | 'react' | 'nextjs' | 'vue';
  entityName!: string;
  description!: string;
  properties?: Record<string, string>;
  methods?: string[];
  dependencies?: string[];
  customRules?: string[];
}

export class BulkTransformationDto implements IBulkTransformationRequest {
  rules!: IBulkTransformationRequest['rules'];
  filePatterns!: string[];
  dryRun?: boolean;
  backup?: boolean;
}

export class GenerateDtoRequestDto implements IDtoGenerationRequest {
  name!: string;
  properties!: Record<string, ITypeDefinition>;
  description?: string;
  isCreate?: boolean;
  isUpdate?: boolean;
  isResponse?: boolean;
  extends?: string[];
  implements?: string[];
}

export class GenerateApiContractDto implements IApiContract {
  path!: string;
  method!: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  summary!: string;
  description?: string;
  tags!: string[];
  requestBody?: IDtoGenerationRequest;
  responseBody?: IDtoGenerationRequest;
  parameters?: IApiParameter[];
  security?: string[];
  deprecated?: boolean;
}

@ApiTags('AI Code Assistant')
@Controller('ai/code-assistant')
export class AiCodeAssistantController {
  constructor(
    private readonly aiCodeAssistantService: AiCodeAssistantService,
    private readonly astCodeModService: AstCodeModService,
    private readonly dynamicTypeChecksService: DynamicTypeChecksService
  ) {}

  @Post('generate-code')
  @ApiOperation({ summary: 'Generate code using AI templates' })
  @ApiResponse({ status: 201, description: 'Code generated successfully' })
  @ApiBody({ type: GenerateCodeDto })
  async generateCode(
    @Body() request: GenerateCodeDto
  ): Promise<ICodeGenerationResult> {
    return this.aiCodeAssistantService.generateCode(request);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get available code templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async getTemplates() {
    return {
      templates: this.aiCodeAssistantService.getAvailableTemplates(),
    };
  }

  @Get('generation-history')
  @ApiOperation({ summary: 'Get code generation history' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully' })
  async getGenerationHistory() {
    return {
      history: this.aiCodeAssistantService.getGenerationHistory(),
    };
  }

  @Post('bulk-transform')
  @ApiOperation({ summary: 'Perform bulk code transformations' })
  @ApiResponse({ status: 201, description: 'Bulk transformation completed' })
  @ApiBody({ type: BulkTransformationDto })
  async performBulkTransformation(
    @Body() request: BulkTransformationDto
  ): Promise<IBulkTransformationResult> {
    return this.astCodeModService.performBulkTransformation(request);
  }

  @Get('transformation-rules')
  @ApiOperation({ summary: 'Get available transformation rules' })
  @ApiResponse({ status: 200, description: 'Rules retrieved successfully' })
  async getTransformationRules() {
    return {
      rules: this.astCodeModService.getPredefinedRules(),
    };
  }

  @Get('transformation-history')
  @ApiOperation({ summary: 'Get transformation history' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully' })
  async getTransformationHistory() {
    return {
      history: this.astCodeModService.getTransformationHistory(),
    };
  }

  @Post('generate-dto')
  @ApiOperation({ summary: 'Generate DTO with validation' })
  @ApiResponse({ status: 201, description: 'DTO generated successfully' })
  @ApiBody({ type: GenerateDtoRequestDto })
  async generateDto(
    @Body() request: GenerateDtoRequestDto
  ): Promise<IGeneratedDto> {
    return this.dynamicTypeChecksService.generateDto(request);
  }

  @Post('generate-api-contract')
  @ApiOperation({ summary: 'Generate API contract with DTOs' })
  @ApiResponse({
    status: 201,
    description: 'API contract generated successfully',
  })
  @ApiBody({ type: GenerateApiContractDto })
  async generateApiContract(
    @Body() request: GenerateApiContractDto
  ): Promise<IGeneratedApiContract> {
    return this.dynamicTypeChecksService.generateApiContract(request);
  }

  @Get('validation-types')
  @ApiOperation({ summary: 'Get available validation types' })
  @ApiResponse({
    status: 200,
    description: 'Validation types retrieved successfully',
  })
  async getValidationTypes() {
    return {
      types: this.dynamicTypeChecksService.getAvailableValidationTypes(),
      validationTemplates: Object.fromEntries(
        this.dynamicTypeChecksService.getValidationTemplates()
      ),
      swaggerTemplates: Object.fromEntries(
        this.dynamicTypeChecksService.getSwaggerTemplates()
      ),
    };
  }

  @Post('infer-type')
  @ApiOperation({ summary: 'Infer type from data' })
  @ApiResponse({ status: 200, description: 'Type inferred successfully' })
  async inferType(@Body() data: { data: unknown; propertyName: string }) {
    return this.dynamicTypeChecksService.inferTypeFromData(
      data.data,
      data.propertyName
    );
  }
}
