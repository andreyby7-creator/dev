import { PartialType } from '@nestjs/swagger';
import { CreateFailoverConfigDto } from './create-failover-config.dto';

export class UpdateFailoverConfigDto extends PartialType(
  CreateFailoverConfigDto
) {}
