import { PartialType } from '@nestjs/swagger';
import { CreateGeographicRouteDto } from './create-geographic-route.dto';

export class UpdateGeographicRouteDto extends PartialType(
  CreateGeographicRouteDto
) {}
