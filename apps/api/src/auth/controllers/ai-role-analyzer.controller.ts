import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AIRoleAnalyzerService } from '../services/ai-role-analyzer.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../../types/roles';

export class AnalyzeRLSPoliciesDto {
  tableName!: string;
  currentPolicies!: string[];
}

@ApiTags('AI Role Analyzer')
@Controller('ai-role-analyzer')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AIRoleAnalyzerController {
  constructor(private readonly aiRoleAnalyzerService: AIRoleAnalyzerService) {}

  @Get('conflicts')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Анализ конфликтов ролей' })
  @ApiResponse({
    status: 200,
    description: 'Список конфликтов ролей с рекомендациями',
  })
  async analyzeRoleConflicts() {
    const conflicts = this.aiRoleAnalyzerService.analyzeRoleConflicts();

    return {
      success: true,
      data: {
        conflicts,
        totalConflicts: conflicts.length,
        criticalConflicts: conflicts.filter(c => c.severity === 'CRITICAL')
          .length,
        highConflicts: conflicts.filter(c => c.severity === 'HIGH').length,
        mediumConflicts: conflicts.filter(c => c.severity === 'MEDIUM').length,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('overlaps')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Анализ перекрытий разрешений' })
  @ApiResponse({
    status: 200,
    description: 'Список перекрытий разрешений между ролями',
  })
  async analyzePermissionOverlaps() {
    const overlaps = this.aiRoleAnalyzerService.analyzePermissionOverlaps();

    return {
      success: true,
      data: {
        overlaps,
        totalOverlaps: overlaps.length,
        highRiskOverlaps: overlaps.filter(o => o.riskLevel === 'HIGH').length,
        mediumRiskOverlaps: overlaps.filter(o => o.riskLevel === 'MEDIUM')
          .length,
        lowRiskOverlaps: overlaps.filter(o => o.riskLevel === 'LOW').length,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post('rls-analysis')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Анализ RLS политик таблицы' })
  @ApiResponse({
    status: 200,
    description: 'Анализ RLS политик с рекомендациями по улучшению',
  })
  async analyzeRLSPolicies(@Body() dto: AnalyzeRLSPoliciesDto) {
    const analysis = this.aiRoleAnalyzerService.analyzeRLSPolicies(
      dto.tableName,
      dto.currentPolicies
    );

    return {
      success: true,
      data: analysis,
    };
  }

  @Get('security-report')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Полный отчет по безопасности ролей' })
  @ApiResponse({
    status: 200,
    description: 'Комплексный отчет по безопасности системы ролей',
  })
  async getSecurityReport() {
    const report = this.aiRoleAnalyzerService.getSecurityReport();

    return {
      success: true,
      data: report,
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Проверка состояния AI-анализатора' })
  @ApiResponse({
    status: 200,
    description: 'Статус AI-анализатора ролей',
  })
  async getHealth() {
    // Быстрая проверка работоспособности
    const conflicts = this.aiRoleAnalyzerService.analyzeRoleConflicts();
    const overlaps = this.aiRoleAnalyzerService.analyzePermissionOverlaps();

    return {
      success: true,
      data: {
        status: 'HEALTHY',
        service: 'AI Role Analyzer',
        version: '1.0.0',
        checks: {
          roleConflictsAnalysis: 'OK',
          permissionOverlapsAnalysis: 'OK',
          totalConflicts: conflicts.length,
          totalOverlaps: overlaps.length,
        },
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('recommendations')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Получить рекомендации по улучшению безопасности' })
  @ApiResponse({
    status: 200,
    description: 'Список рекомендаций по улучшению безопасности ролей',
  })
  async getRecommendations() {
    const report = this.aiRoleAnalyzerService.getSecurityReport();

    return {
      success: true,
      data: {
        recommendations: report.recommendations,
        priority: {
          critical: report.conflicts.critical > 0,
          high: report.conflicts.high > 0 || report.overlaps.highRisk > 0,
          medium: report.conflicts.medium > 0 || report.overlaps.mediumRisk > 0,
        },
        overallScore: report.overallSecurityScore,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('dashboard')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Дашборд безопасности ролей' })
  @ApiResponse({
    status: 200,
    description: 'Дашборд с метриками безопасности ролей',
  })
  async getDashboard() {
    const conflicts = this.aiRoleAnalyzerService.analyzeRoleConflicts();
    const overlaps = this.aiRoleAnalyzerService.analyzePermissionOverlaps();
    const report = this.aiRoleAnalyzerService.getSecurityReport();

    return {
      success: true,
      data: {
        metrics: {
          overallSecurityScore: report.overallSecurityScore,
          totalConflicts: conflicts.length,
          totalOverlaps: overlaps.length,
          criticalIssues: conflicts.filter(c => c.severity === 'CRITICAL')
            .length,
          highIssues:
            conflicts.filter(c => c.severity === 'HIGH').length +
            overlaps.filter(o => o.riskLevel === 'HIGH').length,
        },
        charts: {
          conflictSeverity: {
            critical: conflicts.filter(c => c.severity === 'CRITICAL').length,
            high: conflicts.filter(c => c.severity === 'HIGH').length,
            medium: conflicts.filter(c => c.severity === 'MEDIUM').length,
            low: conflicts.filter(c => c.severity === 'LOW').length,
          },
          overlapRisk: {
            high: overlaps.filter(o => o.riskLevel === 'HIGH').length,
            medium: overlaps.filter(o => o.riskLevel === 'MEDIUM').length,
            low: overlaps.filter(o => o.riskLevel === 'LOW').length,
          },
        },
        recentIssues: conflicts
          .filter(c => c.severity === 'CRITICAL' || c.severity === 'HIGH')
          .slice(0, 5)
          .map(c => ({
            type: 'conflict',
            severity: c.severity,
            description: c.description,
            recommendation: c.recommendation,
          })),
        recommendations: report.recommendations.slice(0, 10),
        timestamp: new Date().toISOString(),
      },
    };
  }
}
