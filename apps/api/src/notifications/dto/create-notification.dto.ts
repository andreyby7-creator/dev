import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsNumber,
  Min,
  IsDateString,
  IsNotEmpty,
  Max,
} from 'class-validator';
import {
  NotificationType,
  NotificationPriority,
} from '../../types/notifications';

export class CreateNotificationDto {
  @ApiProperty({ enum: NotificationType, description: 'Тип уведомления' })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type!: NotificationType;

  @ApiProperty({
    enum: NotificationPriority,
    description: 'Приоритет уведомления',
  })
  @IsEnum(NotificationPriority)
  @IsNotEmpty()
  priority!: NotificationPriority;

  @ApiProperty({ description: 'Получатель уведомления' })
  @IsString()
  @IsNotEmpty()
  recipient!: string;

  @ApiPropertyOptional({ description: 'Тема уведомления' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ description: 'Содержание уведомления' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({ description: 'Метаданные уведомления' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Время отправки (если отложенная отправка)',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({
    description: 'Максимальное количество попыток отправки',
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxRetries?: number;
}
