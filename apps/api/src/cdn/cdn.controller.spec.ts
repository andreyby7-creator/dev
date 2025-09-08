import { vi } from 'vitest';
import { CdnController } from './cdn.controller';
import { CdnService } from './cdn.service';
import type { ICdnStats } from './cdn.service';

describe('CdnController', () => {
  let controller: CdnController;
  let mockCdnService: {
    getConfig: ReturnType<typeof vi.fn>;
    getStats: ReturnType<typeof vi.fn>;
    uploadFile: ReturnType<typeof vi.fn>;
    deleteFile: ReturnType<typeof vi.fn>;
    purgeCache: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockCdnService = {
      getConfig: vi.fn(),
      getStats: vi.fn(),
      uploadFile: vi.fn(),
      deleteFile: vi.fn(),
      purgeCache: vi.fn(),
    };

    controller = new CdnController(mockCdnService as unknown as CdnService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getConfig', () => {
    it('should return CDN configuration', () => {
      const mockConfig = {
        provider: 'cloudflare',
        baseUrl: 'https://cdn.example.com',
        apiKey: 'api-key-123',
        zoneId: 'zone-456',
        distributionId: 'dist-789',
      };
      mockCdnService.getConfig.mockReturnValue(mockConfig);

      const result = controller.getConfig();
      expect(result).toEqual(mockConfig);
      expect(mockCdnService.getConfig).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return CDN statistics', async () => {
      const mockStats: ICdnStats = {
        totalFiles: 100,
        totalSize: '1.5GB',
        cacheHitRate: 95.5,
        bandwidth: '500MB/s',
        requests: 10000,
      };
      mockCdnService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();
      expect(result).toEqual(mockStats);
      expect(mockCdnService.getStats).toHaveBeenCalled();
    });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const mockFile = { filename: 'test.jpg', size: 1024 };
      const path = 'images/test.jpg';
      const mockUrl = 'https://cdn.example.com/images/test.jpg';
      mockCdnService.uploadFile.mockResolvedValue(mockUrl);

      const result = await controller.uploadFile(mockFile, path);
      expect(result).toEqual({ url: mockUrl, path });
      expect(mockCdnService.uploadFile).toHaveBeenCalledWith(mockFile, path);
    });

    it('should handle upload errors', async () => {
      const mockFile = { filename: 'test.jpg', size: 1024 };
      const path = 'images/test.jpg';
      mockCdnService.uploadFile.mockRejectedValue(new Error('Upload failed'));

      await expect(controller.uploadFile(mockFile, path)).rejects.toThrow(
        'Upload failed'
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const path = 'images/test.jpg';
      mockCdnService.deleteFile.mockResolvedValue(true);

      const result = await controller.deleteFile(path);
      expect(result).toEqual({ success: true, path });
      expect(mockCdnService.deleteFile).toHaveBeenCalledWith(path);
    });

    it('should handle delete errors', async () => {
      const path = 'images/test.jpg';
      mockCdnService.deleteFile.mockRejectedValue(new Error('Delete failed'));

      await expect(controller.deleteFile(path)).rejects.toThrow(
        'Delete failed'
      );
    });
  });

  describe('purgeCache', () => {
    it('should purge cache without paths', async () => {
      mockCdnService.purgeCache.mockResolvedValue(true);

      const result = await controller.purgeCache();
      expect(result).toEqual({ success: true });
      expect(mockCdnService.purgeCache).toHaveBeenCalledWith(undefined);
    });

    it('should purge cache for specific paths', async () => {
      const body = { paths: ['images/*', 'css/*'] };
      mockCdnService.purgeCache.mockResolvedValue(true);

      const result = await controller.purgeCache(body);
      expect(result).toEqual({ success: true });
      expect(mockCdnService.purgeCache).toHaveBeenCalledWith([
        'images/*',
        'css/*',
      ]);
    });

    it('should handle purge errors', async () => {
      mockCdnService.purgeCache.mockRejectedValue(new Error('Purge failed'));

      await expect(controller.purgeCache()).rejects.toThrow('Purge failed');
    });
  });

  describe('input validation', () => {
    it('should handle empty file object', async () => {
      const mockFile = {};
      const path = 'images/test.jpg';
      const mockUrl = 'https://cdn.example.com/images/test.jpg';
      mockCdnService.uploadFile.mockResolvedValue(mockUrl);

      const result = await controller.uploadFile(mockFile, path);
      expect(result).toEqual({ url: mockUrl, path });
    });

    it('should handle empty path', async () => {
      const mockFile = { filename: 'test.jpg', size: 1024 };
      const path = '';
      const mockUrl = 'https://cdn.example.com/';
      mockCdnService.uploadFile.mockResolvedValue(mockUrl);

      const result = await controller.uploadFile(mockFile, path);
      expect(result).toEqual({ url: mockUrl, path });
    });

    it('should handle undefined body in purgeCache', async () => {
      mockCdnService.purgeCache.mockResolvedValue(true);

      const result = await controller.purgeCache(undefined);
      expect(result).toEqual({ success: true });
      expect(mockCdnService.purgeCache).toHaveBeenCalledWith(undefined);
    });
  });

  describe('service integration', () => {
    it('should call service methods with correct parameters', async () => {
      const mockFile = { filename: 'test.jpg', size: 1024 };
      const path = 'images/test.jpg';
      const mockUrl = 'https://cdn.example.com/images/test.jpg';

      mockCdnService.uploadFile.mockResolvedValue(mockUrl);
      mockCdnService.deleteFile.mockResolvedValue(true);
      mockCdnService.purgeCache.mockResolvedValue(true);

      await controller.uploadFile(mockFile, path);
      await controller.deleteFile(path);
      await controller.purgeCache();

      expect(mockCdnService.uploadFile).toHaveBeenCalledWith(mockFile, path);
      expect(mockCdnService.deleteFile).toHaveBeenCalledWith(path);
      expect(mockCdnService.purgeCache).toHaveBeenCalledWith(undefined);
    });
  });
});
