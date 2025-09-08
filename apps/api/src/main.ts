import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import * as fs from 'fs';
import helmet from 'helmet';
import * as path from 'path';
import 'reflect-metadata';
import { AppModule } from './app.module';
import {
  getConfig,
  validateAndLoadConfig,
  validateProductionEnv,
} from './config/env.config';
import { initSentry } from './config/sentry.config';
import { LoggerService } from './logger/logger.service';

async function bootstrap() {
  // Валидируем и загружаем конфигурацию в первую очередь
  validateAndLoadConfig();
  validateProductionEnv();
  const config = getConfig();

  // Инициализируем Sentry
  initSentry();

  const app = await NestFactory.create(AppModule, {
    logger: new LoggerService(),
  });

  // Глобальные middleware
  app.use(helmet());
  app.use(compression());

  // CORS настройки
  app.enableCors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Глобальная валидация
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Swagger документация (настраиваем до префикса)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SaleSpot BY API')
    .setDescription(
      'API для управления картами лояльности и маркетинговыми кампаниями'
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Аутентификация и авторизация')
    .addTag('cards', 'Карты лояльности')
    .addTag('networks', 'Сети магазинов')
    .addTag('stores', 'Магазины')
    .addTag('brands', 'Бренды')
    .addTag('analytics', 'Аналитика')
    .addServer('http://localhost:3001', 'Development server')
    .addServer('https://api.salespot.by', 'Production server')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Сохраняем OpenAPI спецификацию для генерации типов
  const openApiPath = path.join(__dirname, '../../openapi.json');
  fs.writeFileSync(openApiPath, JSON.stringify(document, null, 2));

  SwaggerModule.setup('docs', app, document);

  // Глобальный префикс (после Swagger)
  app.setGlobalPrefix('api/v1');

  const port = config.PORT;

  try {
    await app.listen(port);

    console.log(`🚀 API запущен на порту ${port}`);

    console.log(`📚 Swagger документация: http://localhost:${port}/docs`);

    console.log(`📄 OpenAPI спецификация: http://localhost:${port}/api-json`);

    console.log(`💾 OpenAPI файл сохранен: ${openApiPath}`);
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error != null &&
      'code' in error &&
      error.code === 'EADDRINUSE'
    ) {
      console.error(
        `❌ Порт ${port} уже занят. Остановите процесс на этом порту и попробуйте снова.`
      );

      console.error(
        `💡 Команда для освобождения порта: lsof -ti:${port} | xargs kill -9`
      );
    } else {
      console.error(
        '❌ Ошибка запуска API:',
        error instanceof Error ? error.message : String(error)
      );
    }
    process.exit(1);
  }
}
void bootstrap();
