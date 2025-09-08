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
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CRUD } from '../../auth/decorators/crud.decorator';
import { Operation } from '../../auth/decorators/operation.decorator';
import { Resource } from '../../auth/decorators/resource.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import type { NotificationPriority } from '../../types/notifications';
import { NotificationType } from '../../types/notifications';
import { UserRole } from '../../types/roles';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { NotificationsService } from '../services/notifications.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Уведомления
  @Post()
  @ApiOperation({ summary: 'Создать новое уведомление' })
  @ApiBody({ type: CreateNotificationDto })
  @ApiResponse({ status: 201, description: 'Уведомление создано' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER, UserRole.STORE_MANAGER)
  @Resource('notifications')
  @Operation('create')
  @CRUD('create')
  async createNotification(@Body() createDto: CreateNotificationDto) {
    const notification =
      await this.notificationsService.createNotification(createDto);
    return {
      success: true,
      data: notification,
      message: 'Уведомление успешно создано',
    };
  }

  @Get()
  @ApiOperation({ summary: 'Получить список уведомлений' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Количество уведомлений',
  })
  @ApiQuery({ name: 'offset', required: false, description: 'Смещение' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'sent', 'failed', 'cancelled'],
    description: 'Статус уведомления',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: NotificationType,
    description: 'Тип уведомления',
  })
  @ApiResponse({ status: 200, description: 'Список уведомлений' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER, UserRole.STORE_MANAGER)
  @Resource('notifications')
  @Operation('read')
  @CRUD('list')
  async getNotifications(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('_status') _status?: 'pending' | 'sent' | 'failed' | 'cancelled',
    @Query('type') type?: NotificationType
  ) {
    const notifications = await this.notificationsService.getNotifications(
      type,
      limit != null && limit !== '' ? Number.parseInt(limit, 10) : 10,
      offset != null && offset !== '' ? Number.parseInt(offset, 10) : 0
    );

    return {
      success: true,
      data: notifications,
      message: 'Уведомления успешно получены',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить уведомление по ID' })
  @ApiParam({ name: 'id', description: 'ID уведомления' })
  @ApiResponse({ status: 200, description: 'Уведомление найдено' })
  @ApiResponse({ status: 404, description: 'Уведомление не найдено' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER, UserRole.STORE_MANAGER)
  @Resource('notifications')
  @Operation('read')
  @CRUD('read')
  async getNotification(@Param('id') id: string) {
    const notification = await this.notificationsService.getNotification(id);
    return {
      success: true,
      data: notification,
      message: 'Уведомление найдено',
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить уведомление' })
  @ApiParam({ name: 'id', description: 'ID уведомления' })
  @ApiBody({ type: CreateNotificationDto })
  @ApiResponse({ status: 200, description: 'Уведомление обновлено' })
  @ApiResponse({ status: 404, description: 'Уведомление не найдено' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @Resource('notifications')
  @Operation('update')
  @CRUD('update')
  async updateNotification(
    @Param('id') id: string,
    @Body() updateDto: CreateNotificationDto
  ) {
    const processedDto: Partial<{
      type: NotificationType;
      priority: NotificationPriority;
      recipient: string;
      subject?: string;
      content: string;
      metadata?: Record<string, unknown>;
      scheduledAt?: Date;
      maxRetries?: number;
    }> = {
      type: updateDto.type,
      priority: updateDto.priority,
      recipient: updateDto.recipient,
      content: updateDto.content,
    };

    // Добавляем опциональные поля только если они определены
    if (updateDto.subject != null) {
      processedDto.subject = updateDto.subject;
    }
    if (updateDto.metadata != null) {
      processedDto.metadata = updateDto.metadata;
    }
    if (updateDto.maxRetries != null) {
      processedDto.maxRetries = updateDto.maxRetries;
    }

    // Обрабатываем scheduledAt отдельно, если он передан
    if (updateDto.scheduledAt != null) {
      processedDto.scheduledAt =
        typeof updateDto.scheduledAt === 'string'
          ? new Date(updateDto.scheduledAt)
          : updateDto.scheduledAt;
    }

    const notification = await this.notificationsService.updateNotification(
      id,
      processedDto
    );
    return {
      success: true,
      data: notification,
      message: 'Уведомление успешно обновлено',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить уведомление' })
  @ApiParam({ name: 'id', description: 'ID уведомления' })
  @ApiResponse({ status: 200, description: 'Уведомление удалено' })
  @ApiResponse({ status: 404, description: 'Уведомление не найдено' })
  @Roles(UserRole.SUPER_ADMIN)
  @Resource('notifications')
  @Operation('delete')
  @CRUD('delete')
  async deleteNotification(@Param('id') id: string) {
    await this.notificationsService.deleteNotification(id);
    return {
      success: true,
      message: 'Уведомление успешно удалено',
    };
  }

  // Шаблоны
  @Post('templates')
  @ApiOperation({ summary: 'Создать новый шаблон уведомления' })
  @ApiBody({ type: CreateTemplateDto })
  @ApiResponse({ status: 201, description: 'Шаблон создан' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @Resource('notification_templates')
  @Operation('create')
  @CRUD('create')
  async createTemplate(@Body() createDto: CreateTemplateDto) {
    const template = await this.notificationsService.createTemplate(createDto);
    return {
      success: true,
      data: template,
      message: 'Шаблон успешно создан',
    };
  }

  @Get('templates')
  @ApiOperation({ summary: 'Получить список шаблонов' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: NotificationType,
    description: 'Тип уведомления',
  })
  @ApiResponse({ status: 200, description: 'Список шаблонов' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER, UserRole.STORE_MANAGER)
  @Resource('notification_templates')
  @Operation('read')
  @CRUD('list')
  async getTemplates(@Query('type') type?: NotificationType) {
    const templates = await this.notificationsService.getTemplates(type);
    return {
      success: true,
      data: templates,
      message: 'Шаблоны успешно получены',
    };
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Получить шаблон по ID' })
  @ApiParam({ name: 'id', description: 'ID шаблона' })
  @ApiResponse({ status: 200, description: 'Шаблон найден' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER, UserRole.STORE_MANAGER)
  @Resource('notification_templates')
  @Operation('read')
  @CRUD('read')
  async getTemplate(@Param('id') id: string) {
    const template = await this.notificationsService.getTemplate(id);
    return {
      success: true,
      data: template,
      message: 'Шаблон найден',
    };
  }

  @Put('templates/:id')
  @ApiOperation({ summary: 'Обновить шаблон' })
  @ApiParam({ name: 'id', description: 'ID шаблона' })
  @ApiBody({ type: CreateTemplateDto })
  @ApiResponse({ status: 200, description: 'Шаблон обновлен' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @Resource('notification_templates')
  @Operation('update')
  @CRUD('update')
  async updateTemplate(
    @Param('id') id: string,
    @Body() updateDto: CreateTemplateDto
  ) {
    const template = await this.notificationsService.updateTemplate(
      id,
      updateDto
    );
    return {
      success: true,
      data: template,
      message: 'Шаблон успешно обновлен',
    };
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Удалить шаблон' })
  @ApiParam({ name: 'id', description: 'ID шаблона' })
  @ApiResponse({ status: 200, description: 'Шаблон удален' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  @Roles(UserRole.SUPER_ADMIN)
  @Resource('notification_templates')
  @Operation('delete')
  @CRUD('delete')
  async deleteTemplate(@Param('id') id: string) {
    await this.notificationsService.deleteTemplate(id);
    return {
      success: true,
      message: 'Шаблон успешно удален',
    };
  }

  // Статистика
  @Get('stats/overview')
  @ApiOperation({ summary: 'Получить общую статистику уведомлений' })
  @ApiResponse({ status: 200, description: 'Статистика получена' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @Resource('notification_stats')
  @Operation('read')
  @CRUD('read')
  async getStats() {
    const stats = await this.notificationsService.getStats();
    return {
      success: true,
      data: stats,
      message: 'Статистика успешно получена',
    };
  }

  // Предпочтения пользователей
  @Get('preferences/:userId')
  @ApiOperation({ summary: 'Получить предпочтения пользователя' })
  @ApiParam({ name: 'userId', description: 'ID пользователя' })
  @ApiResponse({ status: 200, description: 'Предпочтения получены' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @Resource('notification_preferences')
  @Operation('read')
  @CRUD('read')
  async getUserPreferences(@Param('userId') userId: string) {
    const preferences =
      await this.notificationsService.getUserPreferences(userId);
    return {
      success: true,
      data: preferences,
      message: 'Предпочтения пользователя получены',
    };
  }

  @Put('preferences/:userId/:type')
  @ApiOperation({ summary: 'Обновить предпочтения пользователя' })
  @ApiParam({ name: 'userId', description: 'ID пользователя' })
  @ApiParam({
    name: 'type',
    enum: NotificationType,
    description: 'Тип уведомления',
  })
  @ApiBody({ description: 'Новые предпочтения' })
  @ApiResponse({ status: 200, description: 'Предпочтения обновлены' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @Resource('notification_preferences')
  @Operation('update')
  @CRUD('update')
  async updateUserPreferences(
    @Param('userId') userId: string,
    @Param('type') type: NotificationType,
    @Body() preferences: Record<string, unknown>
  ) {
    const preference = await this.notificationsService.updateUserPreferences(
      userId,
      type,
      preferences
    );
    return {
      success: true,
      data: preference,
      message: 'Предпочтения пользователя обновлены',
    };
  }
}
