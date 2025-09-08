import { IsArray, IsIn, IsNumber, IsString } from 'class-validator';

export class MetricsCollectionDto {
  @IsNumber()
  interval!: number;

  @IsArray()
  @IsString({ each: true })
  metrics!: string[];

  @IsNumber()
  retention!: number;

  @IsIn(['sum', 'avg', 'min', 'max'])
  aggregation!: 'sum' | 'avg' | 'min' | 'max';
}
