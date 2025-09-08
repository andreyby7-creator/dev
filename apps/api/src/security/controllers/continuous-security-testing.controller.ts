import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import type {
  ISecurityTestRequest,
  ISecurityTest,
  ISecurityTestReport,
} from '../services/continuous-security-testing.service';
import { ContinuousSecurityTestingService } from '../services/continuous-security-testing.service';

// DTOs
export class RunSecurityTestDto implements ISecurityTestRequest {
  type!:
    | 'OWASP'
    | 'FUZZING'
    | 'TRIVY'
    | 'SNYK'
    | 'DEPENDENCY_CHECK'
    | 'SAST'
    | 'DAST'
    | 'IAST';
  target!: string;
  configuration?: {
    timeout?: number;
    maxConcurrentTests?: number;
    excludePatterns?: string[];
    includePatterns?: string[];
    customRules?: string[];
    failOnHighSeverity?: boolean;
    generateReport?: boolean;
    notifyOnFailure?: boolean;
  };
  metadata?: Record<string, unknown>;
}

export class RunAllSecurityTestsDto {
  target!: string;
  configuration?: {
    timeout?: number;
    maxConcurrentTests?: number;
    excludePatterns?: string[];
    includePatterns?: string[];
    customRules?: string[];
    failOnHighSeverity?: boolean;
    generateReport?: boolean;
    notifyOnFailure?: boolean;
  };
}

export class GenerateReportDto {
  testIds!: string[];
}

@ApiTags('Continuous Security Testing')
@Controller('security/testing')
export class ContinuousSecurityTestingController {
  constructor(
    private readonly continuousSecurityTestingService: ContinuousSecurityTestingService
  ) {}

  @Post('run-test')
  @ApiOperation({ summary: 'Run a single security test' })
  @ApiResponse({
    status: 201,
    description: 'Security test started successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid test configuration' })
  @ApiBody({ type: RunSecurityTestDto })
  async runSecurityTest(
    @Body() request: RunSecurityTestDto
  ): Promise<ISecurityTest> {
    return this.continuousSecurityTestingService.runSecurityTest(request);
  }

  @Post('run-all-tests')
  @ApiOperation({ summary: 'Run all security tests for a target' })
  @ApiResponse({
    status: 201,
    description: 'All security tests started successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid configuration' })
  @ApiBody({ type: RunAllSecurityTestsDto })
  async runAllSecurityTests(
    @Body() request: RunAllSecurityTestsDto
  ): Promise<ISecurityTest[]> {
    return this.continuousSecurityTestingService.runAllSecurityTests(
      request.target,
      request.configuration
    );
  }

  @Post('generate-report')
  @ApiOperation({ summary: 'Generate security test report' })
  @ApiResponse({ status: 201, description: 'Report generated successfully' })
  @ApiResponse({ status: 404, description: 'Tests not found' })
  @ApiBody({ type: GenerateReportDto })
  async generateSecurityReport(
    @Body() request: GenerateReportDto
  ): Promise<ISecurityTestReport> {
    return this.continuousSecurityTestingService.generateSecurityReport(
      request.testIds
    );
  }

  @Get('active-tests')
  @ApiOperation({ summary: 'Get all active security tests' })
  @ApiResponse({
    status: 200,
    description: 'Active tests retrieved successfully',
  })
  async getActiveTests(): Promise<ISecurityTest[]> {
    return this.continuousSecurityTestingService.getActiveTests();
  }

  @Get('test-history')
  @ApiOperation({ summary: 'Get security test history' })
  @ApiResponse({
    status: 200,
    description: 'Test history retrieved successfully',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of tests to return',
    type: Number,
  })
  async getTestHistory(
    @Query('limit') limit?: number
  ): Promise<ISecurityTest[]> {
    return this.continuousSecurityTestingService.getTestHistory(limit);
  }

  @Get('test/:testId')
  @ApiOperation({ summary: 'Get security test by ID' })
  @ApiResponse({ status: 200, description: 'Test retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Test not found' })
  @ApiParam({ name: 'testId', description: 'Security test ID' })
  async getTestById(
    @Param('testId') testId: string
  ): Promise<ISecurityTest | undefined> {
    return this.continuousSecurityTestingService.getTestById(testId);
  }

  @Post('test/:testId/stop')
  @ApiOperation({ summary: 'Stop a running security test' })
  @ApiResponse({ status: 200, description: 'Test stopped successfully' })
  @ApiResponse({ status: 404, description: 'Test not found' })
  @ApiParam({ name: 'testId', description: 'Security test ID' })
  async stopTest(
    @Param('testId') testId: string
  ): Promise<{ success: boolean }> {
    const stopped =
      await this.continuousSecurityTestingService.stopTest(testId);
    return { success: stopped };
  }

  @Get('health')
  @ApiOperation({ summary: 'Get security testing service health' })
  @ApiResponse({ status: 200, description: 'Service health status' })
  async getHealth(): Promise<{
    status: string;
    activeTests: number;
    totalTests: number;
  }> {
    const activeTests = this.continuousSecurityTestingService.getActiveTests();
    const testHistory = this.continuousSecurityTestingService.getTestHistory();

    return {
      status: 'healthy',
      activeTests: activeTests.length,
      totalTests: testHistory.length,
    };
  }
}
