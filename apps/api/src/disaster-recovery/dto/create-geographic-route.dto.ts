import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateGeographicRouteDto {
  @IsObject()
  userLocation!: {
    country: string;
    region: string;
    city: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };

  @IsString()
  targetDc!: string;

  @IsIn(['nearest', 'lowest-latency', 'least-loaded', 'cost-optimized'])
  routingStrategy!:
    | 'nearest'
    | 'lowest-latency'
    | 'least-loaded'
    | 'cost-optimized';

  @IsOptional()
  @IsObject()
  metrics?: {
    latency: number;
    bandwidth: number;
    cost: number;
    availability: number;
  };
}
