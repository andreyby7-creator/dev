import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsIn,
} from 'class-validator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../types/roles';
import type {
  IIncident,
  ISelfHealingConfig,
  ISimulationResult,
} from '../services/incident-simulation.service';
import { IncidentSimulationService } from '../services/incident-simulation.service';

export class CreateIncidentDto {
  @IsIn([
    'CPU_SPIKE',
    'MEMORY_LEAK',
    'DISK_FULL',
    'NETWORK_LATENCY',
    'DATABASE_TIMEOUT',
    'SERVICE_UNAVAILABLE',
  ])
  type!:
    | 'CPU_SPIKE'
    | 'MEMORY_LEAK'
    | 'DISK_FULL'
    | 'NETWORK_LATENCY'
    | 'DATABASE_TIMEOUT'
    | 'SERVICE_UNAVAILABLE';

  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  severity!: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @IsString()
  description!: string;

  @IsArray()
  @IsString({ each: true })
  affectedServices!: string[];

  @IsOptional()
  metrics?: Record<string, number>;

  @IsOptional()
  @IsBoolean()
  autoRecoveryEnabled?: boolean;
}

export class SimulateIncidentDto {
  @IsIn([
    'CPU_SPIKE',
    'MEMORY_LEAK',
    'DISK_FULL',
    'NETWORK_LATENCY',
    'DATABASE_TIMEOUT',
    'SERVICE_UNAVAILABLE',
  ])
  type!:
    | 'CPU_SPIKE'
    | 'MEMORY_LEAK'
    | 'DISK_FULL'
    | 'NETWORK_LATENCY'
    | 'DATABASE_TIMEOUT'
    | 'SERVICE_UNAVAILABLE';

  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  severity!: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @IsNumber()
  duration!: number; // в секундах
}

export class UpdateSelfHealingConfigDto {
  enabled?: boolean;
  autoRecoveryThreshold?: number;
  maxRecoveryAttempts?: number;
  recoveryTimeout?: number;
  notificationChannels?: string[];
  escalationRules?: Record<string, string[]>;
}

@ApiTags('Incident Simulation & Self-healing')
@Controller('incident-simulation')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class IncidentSimulationController {
  constructor(
    private readonly incidentSimulationService: IncidentSimulationService
  ) {}

  @Post('incidents')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Создать инцидент' })
  @ApiResponse({
    status: 201,
    description: 'Инцидент создан успешно',
  })
  async createIncident(
    @Body() dto: CreateIncidentDto
  ): Promise<{ success: boolean; data: IIncident }> {
    const incident = await this.incidentSimulationService.createIncident(
      dto.type,
      dto.severity,
      dto.description,
      dto.affectedServices,
      dto.metrics ?? {},
      dto.autoRecoveryEnabled ?? true
    );

    return {
      success: true,
      data: incident,
    };
  }

  @Post('simulate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Симулировать инцидент' })
  @ApiResponse({
    status: 200,
    description: 'Симуляция инцидента завершена',
  })
  async simulateIncident(
    @Body() dto: SimulateIncidentDto
  ): Promise<{ success: boolean; data: ISimulationResult }> {
    const result = await this.incidentSimulationService.simulateIncident(
      dto.type,
      dto.severity,
      dto.duration
    );

    return {
      success: true,
      data: result,
    };
  }

  @Get('incidents')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Получить все инциденты' })
  @ApiResponse({
    status: 200,
    description: 'Список всех инцидентов',
  })
  async getIncidents(): Promise<{ success: boolean; data: IIncident[] }> {
    const incidents = this.incidentSimulationService.getIncidents();

    return {
      success: true,
      data: incidents,
    };
  }

  @Get('simulation-results')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Получить результаты симуляций' })
  @ApiResponse({
    status: 200,
    description: 'Результаты всех симуляций',
  })
  async getSimulationResults(): Promise<{
    success: boolean;
    data: ISimulationResult[];
  }> {
    const results = this.incidentSimulationService.getSimulationResults();

    return {
      success: true,
      data: results,
    };
  }

  @Get('self-healing-config')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Получить конфигурацию самовосстановления' })
  @ApiResponse({
    status: 200,
    description: 'Конфигурация самовосстановления',
  })
  async getSelfHealingConfig(): Promise<{
    success: boolean;
    data: ISelfHealingConfig;
  }> {
    const config = this.incidentSimulationService.getSelfHealingConfig();

    return {
      success: true,
      data: config,
    };
  }

  @Post('self-healing-config')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Обновить конфигурацию самовосстановления' })
  @ApiResponse({
    status: 200,
    description: 'Конфигурация обновлена',
  })
  async updateSelfHealingConfig(
    @Body() dto: UpdateSelfHealingConfigDto
  ): Promise<{ success: boolean; message: string }> {
    this.incidentSimulationService.updateSelfHealingConfig(dto);

    return {
      success: true,
      message: 'Self-healing configuration updated successfully',
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Проверка состояния сервиса инцидентов' })
  @ApiResponse({
    status: 200,
    description: 'Статус сервиса инцидентов',
  })
  async getHealth(): Promise<{
    success: boolean;
    data: {
      status: string;
      _service: string;
      incidents: number;
      simulations: number;
    };
  }> {
    const incidents = this.incidentSimulationService.getIncidents();
    const simulations = this.incidentSimulationService.getSimulationResults();

    return {
      success: true,
      data: {
        status: 'HEALTHY',
        _service: 'Incident Simulation & Self-healing',
        incidents: incidents.length,
        simulations: simulations.length,
      },
    };
  }

  @Get('dashboard')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Дашборд инцидентов и самовосстановления' })
  @ApiResponse({
    status: 200,
    description: 'Дашборд с аналитикой инцидентов',
  })
  async getDashboard(): Promise<{
    success: boolean;
    data: {
      incidents: {
        total: number;
        active: number;
        resolved: number;
        bySeverity: Record<string, number>;
        byType: Record<string, number>;
      };
      simulations: {
        total: number;
        successful: number;
        failed: number;
        averageRecoveryTime: number;
      };
      selfHealing: {
        enabled: boolean;
        autoRecoveryThreshold: number;
        recentRecoveries: number;
      };
    };
  }> {
    const incidents = this.incidentSimulationService.getIncidents();
    const simulations = this.incidentSimulationService.getSimulationResults();
    const config = this.incidentSimulationService.getSelfHealingConfig();

    const activeIncidents = incidents.filter(
      incident => incident.status === 'ACTIVE'
    );
    const resolvedIncidents = incidents.filter(
      incident => incident.status === 'RESOLVED'
    );

    const incidentsBySeverity = incidents.reduce(
      (acc, incident) => {
        acc[incident.severity] = (acc[incident.severity] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const incidentsByType = incidents.reduce(
      (acc, incident) => {
        acc[incident.type] = (acc[incident.type] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const successfulSimulations = simulations.filter(sim => sim.success);
    const averageRecoveryTime =
      simulations.length > 0
        ? simulations.reduce((sum, sim) => sum + sim.recoveryTime, 0) /
          simulations.length
        : 0;

    const recentRecoveries = incidents.filter(
      incident =>
        incident.status === 'RESOLVED' &&
        new Date(incident.timestamp).getTime() >
          Date.now() - 24 * 60 * 60 * 1000
    ).length;

    return {
      success: true,
      data: {
        incidents: {
          total: incidents.length,
          active: activeIncidents.length,
          resolved: resolvedIncidents.length,
          bySeverity: incidentsBySeverity,
          byType: incidentsByType,
        },
        simulations: {
          total: simulations.length,
          successful: successfulSimulations.length,
          failed: simulations.length - successfulSimulations.length,
          averageRecoveryTime,
        },
        selfHealing: {
          enabled: config.enabled,
          autoRecoveryThreshold: config.autoRecoveryThreshold,
          recentRecoveries,
        },
      },
    };
  }
}
