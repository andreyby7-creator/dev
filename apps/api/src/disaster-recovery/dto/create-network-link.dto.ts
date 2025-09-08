import { IsString, IsNumber, IsIn } from 'class-validator';

export class CreateNetworkLinkDto {
  @IsString()
  sourceDc!: string;

  @IsString()
  targetDc!: string;

  @IsIn(['backup', 'primary', 'peering'])
  type!: 'backup' | 'primary' | 'peering';

  @IsNumber()
  bandwidth!: number;

  @IsNumber()
  latency!: number;

  @IsString()
  provider!: string;
}
