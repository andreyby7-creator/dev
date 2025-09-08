import { PartialType } from '@nestjs/swagger';
import { CreateIncidentResponseDto } from './create-incident-response.dto';

export class UpdateIncidentResponseDto extends PartialType(
  CreateIncidentResponseDto
) {}
