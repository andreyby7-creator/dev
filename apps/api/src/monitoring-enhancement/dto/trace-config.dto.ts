import { IsObject, IsOptional, IsString } from 'class-validator';

export class TraceConfigDto {
  @IsString()
  _service!: string;

  @IsString()
  operation!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
