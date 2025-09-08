import { IsString, IsObject } from 'class-validator';

export class CreateCapacityPlanDto {
  @IsString()
  dcId!: string;

  @IsObject()
  period!: {
    start: Date;
    end: Date;
  };

  @IsObject()
  currentCapacity!: {
    cpu: number;
    memory: number;
    storage: number;
    network: number;
  };

  @IsObject()
  projectedDemand!: {
    cpu: number;
    memory: number;
    storage: number;
    network: number;
  };
}
