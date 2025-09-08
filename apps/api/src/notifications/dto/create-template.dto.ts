import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { NotificationType } from '../../types/notifications';

export class CreateTemplateDto {
  @ApiProperty({ description: 'Название шаблона' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: NotificationType, description: 'Тип уведомления' })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type!: NotificationType;

  @ApiPropertyOptional({ description: 'Тема уведомления' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ description: 'Содержание шаблона' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty({ description: 'Переменные шаблона', type: [String] })
  @IsArray()
  @IsString({ each: true })
  variables!: string[];

  @ApiPropertyOptional({ description: 'Активен ли шаблон', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
