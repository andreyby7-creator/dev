import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Проверка здоровья API' })
  @ApiResponse({ status: 200, description: 'API работает корректно' })
  getHealth(): { status: string; timestamp: string; uptime: number } {
    return this.appService.getHealth();
  }

  @Get('cards/demo')
  @ApiOperation({ summary: 'Демо карты лояльности' })
  @ApiResponse({ status: 200, description: 'Список демо карт' })
  getDemoCards(): Array<{
    id: string;
    name: string;
    description: string;
    discount: number;
    network: string;
  }> {
    return this.appService.getDemoCards();
  }
}
