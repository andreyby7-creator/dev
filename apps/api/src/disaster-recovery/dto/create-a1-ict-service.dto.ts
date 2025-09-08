import {
  IsString,
  IsNumber,
  IsObject,
  IsOptional,
  IsDateString,
  IsIn,
} from 'class-validator';

export class CreateA1IctServiceDto {
  @IsIn(['DRaaS', 'BaaS', 'TierIII-DC'])
  type!: 'DRaaS' | 'BaaS' | 'TierIII-DC';

  @IsString()
  dcId!: string;

  @IsObject()
  configuration!: {
    sla: number;
    backupRetention: number;
    recoveryTime: number;
    replicationFrequency: number;
  };

  @IsNumber()
  cost!: number;

  @IsDateString()
  contractEndDate!: Date;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
