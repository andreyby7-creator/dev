import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class MessageDto {
  @IsString()
  title!: string;

  @IsString()
  body!: string;

  @IsIn(['low', 'medium', 'high', 'critical'])
  severity!: 'low' | 'medium' | 'high' | 'critical';
}

export class NotificationConfigDto {
  @IsArray()
  @IsString({ each: true })
  channels!: string[];

  @ValidateNested()
  @Type(() => MessageDto)
  message!: MessageDto;

  @IsString()
  _service!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'critical'])
  priority?: 'low' | 'medium' | 'high' | 'critical';
}
