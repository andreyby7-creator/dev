import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

class AlertRuleDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsString()
  metric!: string;

  @IsIn(['gt', 'lt', 'eq', 'gte', 'lte'])
  condition!: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';

  @IsNumber()
  threshold!: number;

  @IsIn(['low', 'medium', 'high', 'critical'])
  severity!: 'low' | 'medium' | 'high' | 'critical';

  @IsBoolean()
  enabled!: boolean;

  @IsNumber()
  cooldown!: number;
}

class EscalationLevelDto {
  @IsNumber()
  delay!: number;

  @IsArray()
  @IsString({ each: true })
  channels!: string[];
}

class EscalationDto {
  @IsBoolean()
  enabled!: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EscalationLevelDto)
  levels!: EscalationLevelDto[];
}

export class AlertConfigDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AlertRuleDto)
  rules!: AlertRuleDto[];

  @IsArray()
  @IsString({ each: true })
  channels!: string[];

  @ValidateNested()
  @Type(() => EscalationDto)
  escalation!: EscalationDto;
}
