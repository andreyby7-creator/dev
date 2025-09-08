import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function HomePage(): JSX.Element {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">SaleSpot BY</h1>
        <p className="text-xl text-gray-600">
          SaaS платформа для управления картами лояльности и маркетинговыми
          кампаниями
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <Card>
          <h3 className="text-lg font-semibold mb-2">Карты лояльности</h3>
          <p className="text-gray-600 mb-4">
            Создавайте и управляйте картами лояльности для ваших клиентов
          </p>
          <Button className="btn-primary">Подробнее</Button>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold mb-2">Аналитика</h3>
          <p className="text-gray-600 mb-4">
            Отслеживайте эффективность кампаний и поведение клиентов
          </p>
          <Button className="btn-primary">Подробнее</Button>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold mb-2">Геофенсинг</h3>
          <p className="text-gray-600 mb-4">
            Отправляйте уведомления при входе клиентов в магазин
          </p>
          <Button className="btn-primary">Подробнее</Button>
        </Card>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Демо карты лояльности</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <h4 className="font-semibold">Скидка 10% на все товары</h4>
            <p className="text-sm text-gray-600">Demo Network</p>
          </Card>
          <Card>
            <h4 className="font-semibold">Скидка 15% на электронику</h4>
            <p className="text-sm text-gray-600">Demo Network</p>
          </Card>
          <Card>
            <h4 className="font-semibold">Скидка 20% на одежду</h4>
            <p className="text-sm text-gray-600">Demo Network</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
