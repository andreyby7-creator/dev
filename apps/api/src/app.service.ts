import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): { status: string; timestamp: string; uptime: number } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  getDemoCards(): Array<{
    id: string;
    name: string;
    description: string;
    discount: number;
    network: string;
  }> {
    return [
      {
        id: 'demo-1',
        name: 'Скидка 10% на все товары',
        description: 'Демо карта лояльности с базовой скидкой',
        discount: 10,
        network: 'Demo Network',
      },
      {
        id: 'demo-2',
        name: 'Скидка 15% на электронику',
        description: 'Демо карта для категории электроники',
        discount: 15,
        network: 'Demo Network',
      },
      {
        id: 'demo-3',
        name: 'Скидка 20% на одежду',
        description: 'Демо карта для категории одежды',
        discount: 20,
        network: 'Demo Network',
      },
    ];
  }
}
