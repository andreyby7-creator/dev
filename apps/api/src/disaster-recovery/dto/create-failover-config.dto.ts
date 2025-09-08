import { IsString, IsBoolean, IsNumber, IsObject } from 'class-validator';

export class CreateFailoverConfigDto {
  @IsString()
  primaryDc!: string;

  @IsString()
  secondaryDc!: string;

  @IsBoolean()
  autoFailover!: boolean;

  @IsNumber()
  failoverThreshold!: number;

  @IsNumber()
  recoveryTimeObjective!: number;

  @IsNumber()
  recoveryPointObjective!: number;

  @IsObject()
  healthChecks!: {
    interval: number;
    timeout: number;
    retries: number;
  };
}
