import { Injectable } from '@nestjs/common';
import type { IRoleMapping } from './role-mapping.service';
import { RoleMappingService } from './role-mapping.service';

export interface IRoleConflict {
  role1: string;
  role2: string;
  conflictingPermissions: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  recommendation: string;
}

export interface IRLSAnalysis {
  tableName: string;
  currentPolicies: string[];
  suggestedPolicies: string[];
  conflicts: string[];
  recommendations: string[];
  securityScore: number; // 0-100
}

export interface IPermissionOverlap {
  permission: string;
  roles: string[];
  overlapLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

@Injectable()
export class AIRoleAnalyzerService {
  constructor(private readonly roleMappingService: RoleMappingService) {}

  /**
   * Анализировать пересечения ролей и выявлять конфликты
   */
  analyzeRoleConflicts(): IRoleConflict[] {
    const conflicts: IRoleConflict[] = [];
    const mappings = this.roleMappingService.getAllMappings();

    for (let i = 0; i < mappings.length; i++) {
      for (let j = i + 1; j < mappings.length; j++) {
        const role1 = mappings[i];
        const role2 = mappings[j];

        if (role1 == null || role2 == null) {
          continue;
        }

        const overlappingPermissions = this.findOverlappingPermissions(
          role1.permissions,
          role2.permissions
        );

        if (overlappingPermissions.length > 0) {
          const conflict = this.assessConflict(
            role1,
            role2,
            overlappingPermissions
          );
          if (conflict) {
            conflicts.push(conflict);
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Найти пересекающиеся разрешения между двумя наборами
   */
  private findOverlappingPermissions(
    permissions1: string[],
    permissions2: string[]
  ): string[] {
    if (permissions1.includes('*') || permissions2.includes('*')) {
      return ['*'];
    }

    return permissions1.filter(permission => permissions2.includes(permission));
  }

  /**
   * Оценить уровень конфликта между ролями
   */
  private assessConflict(
    role1: IRoleMapping,
    role2: IRoleMapping,
    overlappingPermissions: string[]
  ): IRoleConflict | null {
    const severity = this.calculateConflictSeverity(
      role1,
      role2,
      overlappingPermissions
    );

    if (severity === 'LOW') {
      return null; // Игнорируем низкоуровневые конфликты
    }

    return {
      role1: role1.systemRole,
      role2: role2.systemRole,
      conflictingPermissions: overlappingPermissions,
      severity,
      description: this.generateConflictDescription(
        role1,
        role2,
        overlappingPermissions
      ),
      recommendation: this.generateConflictRecommendation(
        role1,
        role2,
        overlappingPermissions,
        severity
      ),
    };
  }

  /**
   * Вычислить уровень серьезности конфликта
   */
  private calculateConflictSeverity(
    _role1: IRoleMapping,
    _role2: IRoleMapping,
    overlappingPermissions: string[]
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const criticalPermissions = [
      '*',
      'admin_access',
      'user_management',
      'billing_management',
    ];
    const highPermissions = [
      'network_management',
      'store_management',
      'brand_management',
    ];
    const mediumPermissions = ['analytics', 'marketing_campaigns'];

    const hasCriticalOverlap = overlappingPermissions.some(p =>
      criticalPermissions.includes(p)
    );
    const hasHighOverlap = overlappingPermissions.some(p =>
      highPermissions.includes(p)
    );
    const hasMediumOverlap = overlappingPermissions.some(p =>
      mediumPermissions.includes(p)
    );

    if (hasCriticalOverlap) return 'CRITICAL';
    if (hasHighOverlap) return 'HIGH';
    if (hasMediumOverlap) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Сгенерировать описание конфликта
   */
  private generateConflictDescription(
    role1: IRoleMapping,
    role2: IRoleMapping,
    overlappingPermissions: string[]
  ): string {
    return `Роли "${role1.systemRole}" и "${role2.systemRole}" имеют пересекающиеся разрешения: ${overlappingPermissions.join(', ')}. Это может привести к нарушению принципа наименьших привилегий.`;
  }

  /**
   * Сгенерировать рекомендацию по устранению конфликта
   */
  private generateConflictRecommendation(
    role1: IRoleMapping,
    role2: IRoleMapping,
    overlappingPermissions: string[],
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  ): string {
    switch (severity) {
      case 'CRITICAL':
        return `Немедленно пересмотрите роли "${role1.systemRole}" и "${role2.systemRole}". Критические разрешения должны быть уникальными для каждой роли.`;
      case 'HIGH':
        return `Рекомендуется разделить разрешения "${overlappingPermissions.join(', ')}" между ролями "${role1.systemRole}" и "${role2.systemRole}" для повышения безопасности.`;
      case 'MEDIUM':
        return `Рассмотрите возможность уточнения разрешений для ролей "${role1.systemRole}" и "${role2.systemRole}" для лучшего разделения ответственности.`;
      default:
        return `Мониторьте использование пересекающихся разрешений между ролями "${role1.systemRole}" и "${role2.systemRole}".`;
    }
  }

  /**
   * Анализировать RLS политики и предлагать улучшения
   */
  analyzeRLSPolicies(
    tableName: string,
    currentPolicies: string[]
  ): IRLSAnalysis {
    const analysis: IRLSAnalysis = {
      tableName,
      currentPolicies,
      suggestedPolicies: [],
      conflicts: [],
      recommendations: [],
      securityScore: 0,
    };

    // Анализ текущих политик
    const securityIssues = this.identifySecurityIssues(currentPolicies);
    analysis.conflicts = securityIssues;

    // Генерация улучшенных политик
    analysis.suggestedPolicies = this.generateImprovedPolicies(tableName);

    // Рекомендации по улучшению
    analysis.recommendations = this.generateRecommendations(
      tableName,
      securityIssues
    );

    // Вычисление security score
    analysis.securityScore = this.calculateSecurityScore(
      currentPolicies,
      securityIssues
    );

    return analysis;
  }

  /**
   * Выявить проблемы безопасности в RLS политиках
   */
  private identifySecurityIssues(policies: string[]): string[] {
    const issues: string[] = [];

    // Проверка на отсутствие политик
    if (policies.length === 0) {
      issues.push('Отсутствуют RLS политики - таблица полностью открыта');
    }

    // Проверка на слишком широкие разрешения
    const wideOpenPolicies = policies.filter(
      p => p.includes('true') || p.includes('1=1') || p.includes('*')
    );
    if (wideOpenPolicies.length > 0) {
      issues.push('Обнаружены слишком широкие RLS политики');
    }

    // Проверка на отсутствие проверки ролей
    const roleBasedPolicies = policies.filter(
      p => p.includes('auth.role()') || p.includes('current_user_role')
    );
    if (roleBasedPolicies.length === 0) {
      issues.push('Отсутствуют проверки ролей в RLS политиках');
    }

    return issues;
  }

  /**
   * Генерировать улучшенные RLS политики
   */
  private generateImprovedPolicies(tableName: string): string[] {
    const improvedPolicies: string[] = [];

    // Базовая политика для всех таблиц
    improvedPolicies.push(
      `-- Базовая политика безопасности для ${tableName}`,
      `CREATE POLICY "secure_${tableName}_access" ON ${tableName}`,
      `FOR ALL USING (auth.role() IS NOT NULL);`
    );

    // Ролевые политики
    const rolePolicies = [
      {
        role: 'super_admin',
        policy: `(auth.role() = 'super_admin')`,
      },
      {
        role: 'network_manager',
        policy: `(auth.role() = 'network_manager' AND network_id IN (SELECT network_id FROM user_networks WHERE user_id = auth.uid()))`,
      },
      {
        role: 'store_manager',
        policy: `(auth.role() = 'store_manager' AND store_id IN (SELECT store_id FROM user_stores WHERE user_id = auth.uid()))`,
      },
      {
        role: 'brand_manager',
        policy: `(auth.role() = 'brand_manager' AND brand_id IN (SELECT brand_id FROM user_brands WHERE user_id = auth.uid()))`,
      },
      {
        role: 'user',
        policy: `(auth.role() = 'user' AND user_id = auth.uid())`,
      },
    ];

    rolePolicies.forEach(({ role, policy }) => {
      improvedPolicies.push(
        `-- Политика для роли ${role}`,
        `CREATE POLICY "${role}_${tableName}_access" ON ${tableName}`,
        `FOR ALL USING (${policy});`
      );
    });

    return improvedPolicies;
  }

  /**
   * Генерировать рекомендации по улучшению
   */
  private generateRecommendations(
    tableName: string,
    issues: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (issues.includes('Отсутствуют RLS политики')) {
      recommendations.push(
        `Создайте базовые RLS политики для таблицы ${tableName}`
      );
    }

    if (issues.includes('Обнаружены слишком широкие RLS политики')) {
      recommendations.push(
        `Ограничьте доступ в RLS политиках таблицы ${tableName} согласно принципу наименьших привилегий`
      );
    }

    if (issues.includes('Отсутствуют проверки ролей')) {
      recommendations.push(
        `Добавьте проверки ролей в RLS политики таблицы ${tableName}`
      );
    }

    recommendations.push(
      `Регулярно аудируйте RLS политики таблицы ${tableName}`
    );
    recommendations.push(
      `Тестируйте RLS политики с различными ролями пользователей`
    );

    return recommendations;
  }

  /**
   * Вычислить security score (0-100)
   */
  private calculateSecurityScore(policies: string[], issues: string[]): number {
    let score = 100;

    // Штрафы за проблемы
    if (issues.includes('Отсутствуют RLS политики')) score -= 50;
    if (issues.includes('Обнаружены слишком широкие RLS политики')) score -= 30;
    if (issues.includes('Отсутствуют проверки ролей')) score -= 20;

    // Бонусы за хорошие практики
    if (policies.length > 0) score += 10;
    if (policies.some(p => p.includes('auth.role()'))) score += 15;
    if (policies.some(p => p.includes('user_id = auth.uid()'))) score += 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Анализировать перекрытия разрешений между ролями
   */
  analyzePermissionOverlaps(): IPermissionOverlap[] {
    const overlaps: IPermissionOverlap[] = [];
    const mappings = this.roleMappingService.getAllMappings();
    const allPermissions = new Set<string>();

    // Собрать все уникальные разрешения
    mappings.forEach(mapping => {
      mapping.permissions.forEach(permission => {
        if (permission !== '*') {
          allPermissions.add(permission);
        }
      });
    });

    // Анализировать каждое разрешение
    allPermissions.forEach(permission => {
      const rolesWithPermission = mappings
        .filter(mapping => mapping.permissions.includes(permission))
        .map(mapping => mapping.systemRole);

      if (rolesWithPermission.length > 1) {
        const overlapLevel = this.calculateOverlapLevel(
          rolesWithPermission.length,
          mappings.length
        );
        const riskLevel = this.calculateRiskLevel(
          permission,
          rolesWithPermission.length
        );

        overlaps.push({
          permission,
          roles: rolesWithPermission,
          overlapLevel,
          riskLevel,
        });
      }
    });

    return overlaps;
  }

  /**
   * Вычислить уровень перекрытия
   */
  private calculateOverlapLevel(
    rolesCount: number,
    totalRoles: number
  ): 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' {
    const percentage = (rolesCount / totalRoles) * 100;

    if (percentage >= 80) return 'HIGH';
    if (percentage >= 50) return 'MEDIUM';
    if (percentage >= 20) return 'LOW';
    return 'NONE';
  }

  /**
   * Вычислить уровень риска
   */
  private calculateRiskLevel(
    permission: string,
    rolesCount: number
  ): 'LOW' | 'MEDIUM' | 'HIGH' {
    const criticalPermissions = [
      '*',
      'admin_access',
      'user_management',
      'billing_management',
    ];
    const highPermissions = [
      'network_management',
      'store_management',
      'brand_management',
    ];

    if (criticalPermissions.includes(permission)) return 'HIGH';
    if (highPermissions.includes(permission)) return 'HIGH';
    if (rolesCount > 3) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Получить отчет по безопасности ролей
   */
  getSecurityReport() {
    const conflicts = this.analyzeRoleConflicts();
    const overlaps = this.analyzePermissionOverlaps();

    const criticalConflicts = conflicts.filter(
      c => c.severity === 'CRITICAL'
    ).length;
    const highConflicts = conflicts.filter(c => c.severity === 'HIGH').length;
    const mediumConflicts = conflicts.filter(
      c => c.severity === 'MEDIUM'
    ).length;

    const highRiskOverlaps = overlaps.filter(
      o => o.riskLevel === 'HIGH'
    ).length;
    const mediumRiskOverlaps = overlaps.filter(
      o => o.riskLevel === 'MEDIUM'
    ).length;

    const overallScore = Math.max(
      0,
      100 -
        criticalConflicts * 20 -
        highConflicts * 10 -
        mediumConflicts * 5 -
        highRiskOverlaps * 5 -
        mediumRiskOverlaps * 2
    );

    return {
      overallSecurityScore: overallScore,
      conflicts: {
        total: conflicts.length,
        critical: criticalConflicts,
        high: highConflicts,
        medium: mediumConflicts,
        details: conflicts,
      },
      overlaps: {
        total: overlaps.length,
        highRisk: highRiskOverlaps,
        mediumRisk: mediumRiskOverlaps,
        details: overlaps,
      },
      recommendations: this.generateOverallRecommendations(conflicts, overlaps),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Генерировать общие рекомендации
   */
  private generateOverallRecommendations(
    conflicts: IRoleConflict[],
    overlaps: IPermissionOverlap[]
  ): string[] {
    const recommendations: string[] = [];

    if (conflicts.filter(c => c.severity === 'CRITICAL').length > 0) {
      recommendations.push(
        'НЕМЕДЛЕННО: Устраните критические конфликты ролей для предотвращения нарушений безопасности'
      );
    }

    if (conflicts.filter(c => c.severity === 'HIGH').length > 0) {
      recommendations.push(
        'ВЫСОКИЙ ПРИОРИТЕТ: Пересмотрите роли с высоким уровнем конфликтов'
      );
    }

    if (overlaps.filter(o => o.riskLevel === 'HIGH').length > 0) {
      recommendations.push(
        'ВЫСОКИЙ ПРИОРИТЕТ: Ограничьте доступ к критическим разрешениям'
      );
    }

    recommendations.push('Регулярно проводите аудит ролей и разрешений');
    recommendations.push(
      'Внедрите автоматизированное тестирование RLS политик'
    );
    recommendations.push('Документируйте все изменения в системе ролей');

    return recommendations;
  }
}
