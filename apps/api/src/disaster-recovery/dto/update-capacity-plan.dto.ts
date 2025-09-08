import { PartialType } from '@nestjs/swagger';
import { CreateCapacityPlanDto } from './create-capacity-plan.dto';

export class UpdateCapacityPlanDto extends PartialType(CreateCapacityPlanDto) {}
