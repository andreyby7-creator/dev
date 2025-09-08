import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CardsService } from './cards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleMappingGuard } from '../auth/guards/role-mapping.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Resource } from '../auth/decorators/resource.decorator';
import { Operation } from '../auth/decorators/operation.decorator';
import { CRUD } from '../auth/decorators/crud.decorator';
import { UserRole } from '../types/roles';

@ApiTags('cards')
@Controller('cards')
@UseGuards(JwtAuthGuard, RoleMappingGuard)
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить список карт лояльности' })
  @ApiResponse({ status: 200, description: 'Список карт' })
  @ApiQuery({ name: 'limit', required: false, description: 'Количество карт' })
  @ApiQuery({ name: 'offset', required: false, description: 'Смещение' })
  @Roles(
    UserRole.USER,
    UserRole.STORE_MANAGER,
    UserRole.BRAND_MANAGER,
    UserRole.NETWORK_MANAGER,
    UserRole.SUPER_ADMIN
  )
  @Resource('cards')
  @Operation('read')
  @CRUD('list')
  async getCards(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ): Promise<
    Array<{
      id: string;
      name: string;
      description: string;
      discount: number;
      network: string;
    }>
  > {
    return this.cardsService.getCards(
      limit != null && limit !== '' ? Number.parseInt(limit, 10) : 10,
      offset != null && offset !== '' ? Number.parseInt(offset, 10) : 0
    );
  }
}
