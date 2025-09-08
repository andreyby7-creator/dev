import { PartialType } from '@nestjs/swagger';
import { CreateA1IctServiceDto } from './create-a1-ict-service.dto';

export class UpdateA1IctServiceDto extends PartialType(CreateA1IctServiceDto) {}
