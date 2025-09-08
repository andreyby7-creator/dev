import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateDataCenterDto {
  @IsString()
  name!: string;

  @IsString()
  region!: string;

  @IsIn(['RU', 'BY'])
  country!: 'RU' | 'BY';

  @IsString()
  city!: string;

  @IsObject()
  coordinates!: {
    latitude: number;
    longitude: number;
  };

  @IsObject()
  capacity!: {
    cpu: number;
    memory: number;
    storage: number;
    network: number;
  };

  @IsOptional()
  @IsIn(['active', 'maintenance', 'offline'])
  status?: 'active' | 'maintenance' | 'offline';
}
