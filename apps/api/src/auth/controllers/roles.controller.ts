import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '../../types/roles';
import { CRUD } from '../decorators/crud.decorator';
import { Operation } from '../decorators/operation.decorator';
import { Resource } from '../decorators/resource.decorator';
import { Roles } from '../decorators/roles.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RoleMappingGuard } from '../guards/role-mapping.guard';
import { RoleMappingService } from '../services/role-mapping.service';

@ApiTags('roles')
@Controller('auth/roles')
@UseGuards(JwtAuthGuard, RoleMappingGuard)
export class RolesController {
  constructor(private readonly roleMappingService: RoleMappingService) {}

  @Get()
  @ApiOperation({ summary: 'Получить все маппинги ролей' })
  @ApiResponse({ status: 200, description: 'Список маппингов ролей' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @Resource('roles')
  @Operation('read')
  @CRUD('list')
  async getAllRoles() {
    const mappings = this.roleMappingService.getAllMappings();
    return {
      success: true,
      data: mappings,
      message: 'Роли успешно получены',
    };
  }

  @Get('hierarchy')
  @ApiOperation({ summary: 'Получить иерархию ролей' })
  @ApiResponse({ status: 200, description: 'Иерархия ролей' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @Resource('roles')
  @Operation('read')
  @CRUD('read')
  async getRoleHierarchy() {
    const hierarchy = this.roleMappingService.getRoleHierarchy();
    return {
      success: true,
      data: hierarchy,
      message: 'Иерархия ролей получена',
    };
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Получить разрешения для роли' })
  @ApiQuery({ name: 'role', required: true, description: 'Роль пользователя' })
  @ApiResponse({ status: 200, description: 'Разрешения для роли' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @Resource('roles')
  @Operation('read')
  @CRUD('read')
  async getPermissions(@Query('role') role: UserRole) {
    const permissions = this.roleMappingService.getPermissions(role);
    return {
      success: true,
      data: permissions,
      message: `Разрешения для роли ${role} получены`,
    };
  }

  @Get('validate/:systemRole')
  @ApiOperation({ summary: 'Проверить валидность системной роли' })
  @ApiParam({ name: 'systemRole', description: 'Системная роль' })
  @ApiResponse({ status: 200, description: 'Результат валидации' })
  @Roles(UserRole.SUPER_ADMIN)
  @Resource('roles')
  @Operation('read')
  @CRUD('read')
  async validateSystemRole(@Param('systemRole') systemRole: string) {
    const isValid = this.roleMappingService.isValidSystemRole(systemRole);
    const internalRole = this.roleMappingService.getInternalRole(systemRole);

    return {
      success: true,
      data: {
        systemRole,
        isValid,
        internalRole,
        description: this.roleMappingService.getRoleDescription(systemRole),
      },
      message: `Валидация роли ${systemRole} завершена`,
    };
  }

  @Post('mapping')
  @ApiOperation({ summary: 'Создать новый маппинг роли' })
  @ApiBody({ description: 'Данные для маппинга роли' })
  @ApiResponse({ status: 201, description: 'Маппинг роли создан' })
  @Roles(UserRole.SUPER_ADMIN)
  @Resource('roles')
  @Operation('create')
  @CRUD('create')
  async createRoleMapping(@Body() mappingData: Record<string, unknown>) {
    // В реальном приложении здесь была бы валидация и создание
    return {
      success: true,
      data: mappingData,
      message: 'Маппинг роли создан',
    };
  }

  @Put('mapping/:systemRole')
  @ApiOperation({ summary: 'Обновить маппинг роли' })
  @ApiParam({ name: 'systemRole', description: 'Системная роль' })
  @ApiBody({ description: 'Новые данные для маппинга' })
  @ApiResponse({ status: 200, description: 'Маппинг роли обновлен' })
  @Roles(UserRole.SUPER_ADMIN)
  @Resource('roles')
  @Operation('update')
  @CRUD('update')
  async updateRoleMapping(
    @Param('systemRole') systemRole: string,
    @Body() mappingData: Record<string, unknown>
  ) {
    // В реальном приложении здесь была бы валидация и обновление
    return {
      success: true,
      data: { systemRole, ...mappingData },
      message: `Маппинг роли ${systemRole} обновлен`,
    };
  }

  @Delete('mapping/:systemRole')
  @ApiOperation({ summary: 'Удалить маппинг роли' })
  @ApiParam({ name: 'systemRole', description: 'Системная роль' })
  @ApiResponse({ status: 200, description: 'Маппинг роли удален' })
  @Roles(UserRole.SUPER_ADMIN)
  @Resource('roles')
  @Operation('delete')
  @CRUD('delete')
  async deleteRoleMapping(@Param('systemRole') systemRole: string) {
    // В реальном приложении здесь была бы проверка зависимостей и удаление
    return {
      success: true,
      data: { systemRole },
      message: `Маппинг роли ${systemRole} удален`,
    };
  }

  @Get('can-manage/:targetRole')
  @ApiOperation({
    summary: 'Проверить, может ли текущая роль управлять целевой',
  })
  @ApiParam({ name: 'targetRole', description: 'Целевая роль' })
  @ApiQuery({
    name: 'managerRole',
    required: true,
    description: 'Роль менеджера',
  })
  @ApiResponse({ status: 200, description: 'Результат проверки' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @Resource('roles')
  @Operation('read')
  @CRUD('read')
  async canManageRole(
    @Param('targetRole') targetRole: UserRole,
    @Query('managerRole') managerRole: UserRole
  ) {
    const canManage = this.roleMappingService.canManageRole(
      managerRole,
      targetRole
    );

    return {
      success: true,
      data: {
        managerRole,
        targetRole,
        canManage,
        reason: canManage
          ? `${managerRole} может управлять ${targetRole}`
          : `${managerRole} не может управлять ${targetRole}`,
      },
      message: 'Проверка прав управления завершена',
    };
  }
}
