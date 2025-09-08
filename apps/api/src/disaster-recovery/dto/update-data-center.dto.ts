import { PartialType } from '@nestjs/swagger';
import { CreateDataCenterDto } from './create-data-center.dto';

export class UpdateDataCenterDto extends PartialType(CreateDataCenterDto) {}
