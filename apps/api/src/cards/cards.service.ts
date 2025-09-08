import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CardsService {
  private readonly logger = new Logger(CardsService.name);

  constructor() {}

  async getCards(
    limit: number = 10,
    offset: number = 0
  ): Promise<
    Array<{
      id: string;
      name: string;
      description: string;
      discount: number;
      network: string;
    }>
  > {
    try {
      // Пока возвращаем демо данные, позже заменим на реальные запросы к Supabase
      return [
        {
          id: 'card-1',
          name: 'Скидка 10% на все товары',
          description: 'Базовая карта лояльности с универсальной скидкой',
          discount: 10,
          network: 'Demo Network',
        },
        {
          id: 'card-2',
          name: 'Скидка 15% на электронику',
          description: 'Специальная карта для категории электроники',
          discount: 15,
          network: 'Demo Network',
        },
        {
          id: 'card-3',
          name: 'Скидка 20% на одежду',
          description: 'Карта лояльности для модной одежды',
          discount: 20,
          network: 'Demo Network',
        },
      ].slice(offset, offset + limit);
    } catch (error: unknown) {
      this.logger.error('Ошибка получения карт:', error);
      return [];
    }
  }
}
