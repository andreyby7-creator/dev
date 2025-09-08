import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class WidgetDto {
  @IsString()
  type!: string;

  @IsString()
  title!: string;

  @IsObject()
  config!: Record<string, unknown>;

  @IsString()
  dataSource!: string;
}

export class DashboardConfigDto {
  @IsString()
  name!: string;

  @IsString()
  description!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WidgetDto)
  widgets!: WidgetDto[];

  @IsOptional()
  @IsIn(['grid', 'freeform'])
  layout?: 'grid' | 'freeform';

  @IsOptional()
  @IsIn(['light', 'dark', 'auto'])
  theme?: 'light' | 'dark' | 'auto';

  @IsOptional()
  isPublic?: boolean;
}
