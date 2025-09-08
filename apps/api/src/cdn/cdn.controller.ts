import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { ICdnStats } from './cdn.service';
import { CdnService } from './cdn.service';

@ApiTags('cdn')
@Controller('cdn')
export class CdnController {
  constructor(private readonly cdnService: CdnService) {}

  @Get('config')
  @ApiOperation({ summary: 'Получить конфигурацию CDN' })
  @ApiResponse({ status: 200, description: 'Конфигурация CDN' })
  getConfig() {
    return this.cdnService.getConfig();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Получить статистику CDN' })
  @ApiResponse({ status: 200, description: 'Статистика CDN' })
  async getStats(): Promise<ICdnStats> {
    return this.cdnService.getStats();
  }

  @Post('upload/:path')
  @ApiOperation({ summary: 'Загрузить файл в CDN' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Файл загружен' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Record<string, unknown>,
    @Param('path') path: string
  ) {
    const cdnUrl = await this.cdnService.uploadFile(file, path);
    return { url: cdnUrl, path };
  }

  @Delete('file/:path')
  @ApiOperation({ summary: 'Удалить файл из CDN' })
  @ApiResponse({ status: 200, description: 'Файл удален' })
  async deleteFile(@Param('path') path: string) {
    const success = await this.cdnService.deleteFile(path);
    return { success, path };
  }

  @Post('purge')
  @ApiOperation({ summary: 'Очистить кеш CDN' })
  @ApiResponse({ status: 200, description: 'Кеш очищен' })
  async purgeCache(@Body() body?: { paths?: string[] }) {
    const success = await this.cdnService.purgeCache(body?.paths);
    return { success };
  }
}
