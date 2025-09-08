import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class SectionDto {
  @IsString()
  title!: string;

  @IsIn(['chart', 'table', 'metric', 'text'])
  type!: 'chart' | 'table' | 'metric' | 'text';

  @IsObject()
  config!: Record<string, unknown>;
}

export class ReportConfigDto {
  @IsOptional()
  @IsString()
  templateId?: string;

  @IsString()
  name!: string;

  @IsIn(['performance', 'security', 'usage', 'error', 'custom'])
  type!: 'performance' | 'security' | 'usage' | 'error' | 'custom';

  @IsString()
  timeRange!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections!: SectionDto[];

  @IsIn(['pdf', 'html', 'json', 'csv'])
  format!: 'pdf' | 'html' | 'json' | 'csv';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipients?: string[];
}
