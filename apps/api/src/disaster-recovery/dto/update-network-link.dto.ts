import { PartialType } from '@nestjs/swagger';
import { CreateNetworkLinkDto } from './create-network-link.dto';

export class UpdateNetworkLinkDto extends PartialType(CreateNetworkLinkDto) {}
