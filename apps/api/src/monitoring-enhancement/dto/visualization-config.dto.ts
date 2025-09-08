import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

class ChartDto {
  @IsString()
  name!: string;

  @IsString()
  type!: string;

  @IsString()
  dataSource!: string;

  @IsOptional()
  @IsString()
  query?: string;

  @IsString()
  timeRange!: string;

  @IsString()
  aggregation!: string;

  @IsArray()
  @IsString({ each: true })
  dimensions!: string[];

  @IsArray()
  @IsString({ each: true })
  metrics!: string[];
}

export class VisualizationConfigDto {
  @IsString()
  name!: string;

  @IsString()
  description!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChartDto)
  charts!: ChartDto[];

  @IsOptional()
  @IsString()
  visibility?: string;
}
