import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateIncidentResponseDto {
  @IsIn([
    'power-outage',
    'network-failure',
    'hardware-failure',
    'natural-disaster',
  ])
  type!:
    | 'power-outage'
    | 'network-failure'
    | 'hardware-failure'
    | 'natural-disaster';

  @IsIn(['low', 'medium', 'high', 'critical'])
  severity!: 'low' | 'medium' | 'high' | 'critical';

  @IsArray()
  @IsString({ each: true })
  affectedDcs!: string[];

  @IsString()
  description!: string;

  @IsString()
  playbook!: string;

  @IsOptional()
  @IsIn(['resolved', 'detected', 'responding', 'mitigated'])
  status?: 'resolved' | 'detected' | 'responding' | 'mitigated';
}
