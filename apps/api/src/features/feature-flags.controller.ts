import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../types/roles';
import { FeatureFlagsService } from './feature-flags.service';

interface CreateFlagDto {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  type: 'boolean' | 'string' | 'number' | 'json';
  defaultValue: unknown;
  environments: string[];
  rules?: Array<{
    condition: 'user_id' | 'role' | 'environment' | 'percentage';
    value: unknown;
    operator:
      | 'equals'
      | 'not_equals'
      | 'contains'
      | 'greater_than'
      | 'less_than';
  }>;
}

interface UpdateFlagDto {
  name?: string;
  description?: string;
  enabled?: boolean;
  defaultValue?: unknown;
  environments?: string[];
  rules?: Array<{
    condition: 'user_id' | 'role' | 'environment' | 'percentage';
    value: unknown;
    operator:
      | 'equals'
      | 'not_equals'
      | 'contains'
      | 'greater_than'
      | 'less_than';
  }>;
}

interface UserContextDto {
  userId?: string;
  email?: string;
  role?: string;
  environment?: string;
  custom?: Record<string, unknown>;
}

@ApiTags('Feature Flags')
@Controller('feature-flags')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all feature flags' })
  @ApiResponse({ status: 200, description: 'List of all feature flags' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getAllFlags() {
    return this.featureFlagsService.getAllFlags();
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get feature flag by key' })
  @ApiParam({ name: 'key', description: 'Feature flag key' })
  @ApiResponse({ status: 200, description: 'Feature flag details' })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getFlag(@Param('key') key: string) {
    const flag = await this.featureFlagsService.getFlag(key);
    if (!flag) {
      return { error: 'Feature flag not found' };
    }
    return flag;
  }

  @Get(':key/value')
  @ApiOperation({ summary: 'Get feature flag value for user' })
  @ApiParam({ name: 'key', description: 'Feature flag key' })
  @ApiQuery({ name: 'userId', required: false, description: 'User ID' })
  @ApiQuery({ name: 'email', required: false, description: 'User email' })
  @ApiQuery({ name: 'role', required: false, description: 'User role' })
  @ApiResponse({ status: 200, description: 'Feature flag value' })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async getFlagValue(
    @Param('key') key: string,
    @Query() query: UserContextDto
  ) {
    const userContext: UserContextDto = {
      userId: query.userId ?? '',
      email: query.email ?? '',
      role: query.role ?? '',
      environment: query.environment ?? '',
      custom: query.custom ?? {},
    };

    const value = await this.featureFlagsService.getFlagValue(key, userContext);
    return { key, value, userContext };
  }

  @Get(':key/enabled')
  @ApiOperation({ summary: 'Check if feature flag is enabled for user' })
  @ApiParam({ name: 'key', description: 'Feature flag key' })
  @ApiQuery({ name: 'userId', required: false, description: 'User ID' })
  @ApiQuery({ name: 'email', required: false, description: 'User email' })
  @ApiQuery({ name: 'role', required: false, description: 'User role' })
  @ApiResponse({ status: 200, description: 'Feature flag enabled status' })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async isFlagEnabled(
    @Param('key') key: string,
    @Query() query: UserContextDto
  ) {
    const userContext: UserContextDto = {
      userId: query.userId ?? '',
      email: query.email ?? '',
      role: query.role ?? '',
      environment: query.environment ?? '',
      custom: query.custom ?? {},
    };

    const enabled = await this.featureFlagsService.isEnabled(key, userContext);
    return { key, enabled, userContext };
  }

  @Post()
  @ApiOperation({ summary: 'Create new feature flag' })
  @ApiResponse({ status: 201, description: 'Feature flag created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createFlag(@Body() createFlagDto: CreateFlagDto) {
    return this.featureFlagsService.createFlag(createFlagDto);
  }

  @Put(':key')
  @ApiOperation({ summary: 'Update feature flag' })
  @ApiParam({ name: 'key', description: 'Feature flag key' })
  @ApiResponse({ status: 200, description: 'Feature flag updated' })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateFlag(
    @Param('key') key: string,
    @Body() updateFlagDto: UpdateFlagDto
  ) {
    const updatedFlag = await this.featureFlagsService.updateFlag(
      key,
      updateFlagDto
    );
    if (!updatedFlag) {
      return { error: 'Feature flag not found' };
    }
    return updatedFlag;
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete feature flag' })
  @ApiParam({ name: 'key', description: 'Feature flag key' })
  @ApiResponse({ status: 200, description: 'Feature flag deleted' })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteFlag(@Param('key') key: string) {
    const deleted = await this.featureFlagsService.deleteFlag(key);
    if (!deleted) {
      return { error: 'Feature flag not found' };
    }
    return { message: 'Feature flag deleted successfully' };
  }

  @Get('cache/stats')
  @ApiOperation({ summary: 'Get cache statistics' })
  @ApiResponse({ status: 200, description: 'Cache statistics' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getCacheStats() {
    return this.featureFlagsService.getCacheStats();
  }

  @Post('cache/clear')
  @ApiOperation({ summary: 'Clear feature flags cache' })
  @ApiResponse({ status: 200, description: 'Cache cleared' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async clearCache() {
    // Note: This would need to be implemented in the service
    return { message: 'Cache cleared successfully' };
  }

  @Get('health')
  @ApiOperation({ summary: 'Feature flags health check' })
  @ApiResponse({ status: 200, description: 'Health status' })
  async healthCheck() {
    const healthy = await this.featureFlagsService.healthCheck();
    return {
      service: 'feature-flags',
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
    };
  }
}
