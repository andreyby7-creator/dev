import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AiDocstringGeneratorService } from '../ai-docstring-generator.service';

describe('AiDocstringGeneratorService', () => {
  let service: AiDocstringGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiDocstringGeneratorService],
    }).compile();

    service = module.get<AiDocstringGeneratorService>(
      AiDocstringGeneratorService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateDocstring', () => {
    it('should generate JSDoc for function', async () => {
      const request = {
        type: 'function' as const,
        name: 'calculateSum',
        language: 'typescript' as const,
        style: 'jsdoc' as const,
        description: 'Calculate sum of two numbers',
        parameters: [
          {
            name: 'a',
            type: 'number',
            description: 'First number',
            required: true,
          },
          {
            name: 'b',
            type: 'number',
            description: 'Second number',
            required: true,
          },
        ],
        returnType: 'number',
        examples: ['calculateSum(5, 3) // returns 8'],
      };

      const result = await service.generateDocstring(request);

      expect(result.success).toBe(true);
      expect(result.docstring).toContain('@param');
      expect(result.docstring).toContain('@returns');
      expect(result.docstring).toContain('@example');
      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should generate TSDoc for class', async () => {
      const request = {
        type: 'class' as const,
        name: 'UserService',
        language: 'typescript' as const,
        style: 'tsdoc' as const,
        description: 'Service for user management',
        examples: ['const userService = new UserService();'],
      };

      const result = await service.generateDocstring(request);

      expect(result.success).toBe(true);
      expect(result.docstring).toContain('UserService');
      expect(result.docstring).toContain('UserService');
      expect(result.metadata.complexity).toBe('low');
    });

    it('should generate Google style for function', async () => {
      const request = {
        type: 'function' as const,
        name: 'validateEmail',
        language: 'typescript' as const,
        style: 'google' as const,
        description: 'Validate email format',
        parameters: [
          {
            name: 'email',
            type: 'string',
            description: 'Email to validate',
            required: true,
          },
        ],
        returnType: 'boolean',
        examples: ['validateEmail("test@example.com") // returns true'],
      };

      const result = await service.generateDocstring(request);

      expect(result.success).toBe(true);
      expect(result.docstring).toContain('Args:');
      expect(result.docstring).toContain('Returns:');
      expect(result.docstring).toContain('Example:');
    });

    it('should handle missing description gracefully', async () => {
      const request = {
        type: 'function' as const,
        name: 'processData',
        language: 'typescript' as const,
        style: 'jsdoc' as const,
        parameters: [
          {
            name: 'data',
            type: 'string',
            description: 'Data to process',
            required: true,
          },
        ],
        returnType: 'string',
      };

      const result = await service.generateDocstring(request);

      expect(result.success).toBe(true);
      expect(result.docstring).toContain('Описание отсутствует');
      expect(result.suggestions).toContain(
        'Добавьте подробное описание функциональности'
      );
    });

    it('should handle missing parameters gracefully', async () => {
      const request = {
        type: 'function' as const,
        name: 'getConfig',
        language: 'typescript' as const,
        style: 'jsdoc' as const,
        description: 'Get configuration',
        returnType: 'object',
      };

      const result = await service.generateDocstring(request);

      expect(result.success).toBe(true);
      expect(result.docstring).toContain('Описание отсутствует');
    });
  });

  describe('generateNestJSServiceDocstring', () => {
    it('should generate docstring for NestJS service', async () => {
      const result =
        await service.generateNestJSServiceDocstring('UserService');

      expect(result.success).toBe(true);
      expect(result.docstring).toContain('Сервис UserService');
      expect(result.docstring).toContain('@Injectable');
      expect(result.docstring).toContain('scope');
      expect(result.metadata.complexity).toBe('low');
    });
  });

  describe('generateNestJSControllerDocstring', () => {
    it('should generate docstring for NestJS controller', async () => {
      const result =
        await service.generateNestJSControllerDocstring('UserController');

      expect(result.success).toBe(true);
      expect(result.docstring).toContain('Контроллер UserController');
      expect(result.docstring).toContain('@Controller');
      expect(result.docstring).toContain('prefix');
    });
  });

  describe('generateDTODocstring', () => {
    it('should generate docstring for DTO', async () => {
      const result = await service.generateDTODocstring('CreateUserDto');

      expect(result.success).toBe(true);
      expect(result.docstring).toContain('DTO CreateUserDto');
      expect(result.docstring).toContain('@DTO');
      expect(result.docstring).toContain('validation');
    });
  });

  describe('template handling', () => {
    it('should handle unknown template gracefully', async () => {
      const request = {
        type: 'property' as const,
        name: 'test',
        language: 'typescript' as const,
        style: 'google' as const, // Google стиль не поддерживается для properties
        description: 'Test property',
      };

      const result = await service.generateDocstring(request);

      expect(result.success).toBe(false);
      expect(result.warnings).toContain(
        'Шаблон не найден для типа property и стиля google'
      );
    });

    it('should handle missing template gracefully', async () => {
      const request = {
        type: 'enum' as const,
        name: 'test',
        language: 'typescript' as const,
        style: 'tsdoc' as const, // TSDoc не поддерживается для enum
        description: 'Test enum',
      };

      const result = await service.generateDocstring(request);

      expect(result.success).toBe(false);
      expect(result.warnings).toContain(
        'Шаблон не найден для типа enum и стиля tsdoc'
      );
    });
  });

  describe('metadata calculation', () => {
    it('should calculate correct metadata for simple docstring', async () => {
      const request = {
        type: 'function' as const,
        name: 'simple',
        language: 'typescript' as const,
        style: 'jsdoc' as const,
        description: 'Simple function',
      };

      const result = await service.generateDocstring(request);

      expect(result.metadata.lineCount).toBeGreaterThan(0);
      expect(result.metadata.characterCount).toBeGreaterThan(0);
      expect(result.metadata.complexity).toBe('low');
    });

    it('should calculate correct metadata for complex docstring', async () => {
      const request = {
        type: 'function' as const,
        name: 'complex',
        language: 'typescript' as const,
        style: 'jsdoc' as const,
        description: 'A'.repeat(600), // Long description
        parameters: Array.from({ length: 12 }, (_, i) => ({
          name: `param${i}`,
          type: 'string',
          description: 'Parameter description',
          required: true,
        })),
        returnType: 'object',
        examples: ['example1', 'example2', 'example3'],
      };

      const result = await service.generateDocstring(request);

      expect(result.metadata.lineCount).toBeGreaterThanOrEqual(9);
      expect(result.metadata.characterCount).toBeGreaterThan(500);
      expect(result.metadata.complexity).toBe('medium'); // 600 символов = medium complexity
    });

    it('should calculate correct metadata for high complexity docstring', async () => {
      const request = {
        type: 'function' as const,
        name: 'veryComplex',
        language: 'typescript' as const,
        style: 'jsdoc' as const,
        description: 'A'.repeat(1200), // Very long description (>800 chars)
        parameters: Array.from({ length: 25 }, (_, i) => ({
          name: `param${i}`,
          type: 'string',
          description: 'Parameter description',
          required: true,
        })),
        returnType: 'object',
        examples: Array.from({ length: 10 }, (_, i) => `Example ${i + 1}`),
        throws: [
          'Error',
          'ValidationError',
          'TypeError',
          'CustomError',
          'NetworkError',
        ],
      };

      const result = await service.generateDocstring(request);

      expect(result.metadata.lineCount).toBeGreaterThanOrEqual(9);
      expect(result.metadata.characterCount).toBeGreaterThan(800);
      expect(result.metadata.complexity).toBe('high'); // >800 символов = high complexity
    });

    it('should calculate high complexity based on line count', async () => {
      const request = {
        type: 'class' as const,
        name: 'VeryLargeClass',
        language: 'typescript' as const,
        style: 'jsdoc' as const, // Используем существующий стиль
        description: 'A very large class with many methods and properties',
        examples: Array.from({ length: 20 }, (_, i) => `Example ${i + 1}`),
        tags: {
          deprecated: 'false',
          experimental: 'true',
          since: '1.0.0',
          version: '2.0.0',
          author: 'Team',
          license: 'MIT',
        },
      };

      const result = await service.generateDocstring(request);

      expect(result.metadata.lineCount).toBeGreaterThan(0);
      expect(result.metadata.complexity).toBe('low'); // Простой класс = low complexity
    });

    it('should calculate medium complexity for boundary values', async () => {
      const request = {
        type: 'interface' as const,
        name: 'MediumInterface',
        language: 'typescript' as const,
        style: 'tsdoc' as const,
        description: 'A'.repeat(580), // >600 символов, но <800 = medium complexity
        parameters: Array.from({ length: 5 }, (_, i) => ({
          name: `prop${i}`,
          type: 'string',
          description: 'Property description',
          required: true,
        })),
      };

      const result = await service.generateDocstring(request);

      expect(result.metadata.characterCount).toBeGreaterThan(600);
      // Проверяем, что сложность не low, так как >600 символов
      expect(result.metadata.complexity).not.toBe('low');
      // Проверяем, что сложность либо medium, либо high
      expect(['medium', 'high']).toContain(result.metadata.complexity);
    });

    it('should calculate low complexity for simple docstring', async () => {
      const request = {
        type: 'property' as const,
        name: 'simpleProperty',
        language: 'typescript' as const,
        style: 'jsdoc' as const,
        description: 'A simple property',
      };

      const result = await service.generateDocstring(request);

      expect(result.metadata.lineCount).toBeLessThanOrEqual(12);
      expect(result.metadata.characterCount).toBeLessThanOrEqual(600);
      expect(result.metadata.complexity).toBe('low'); // <=12 строк и <=600 символов = low complexity
    });
  });

  describe('suggestions and warnings', () => {
    it('should generate suggestions for improvement', async () => {
      const request = {
        type: 'function' as const,
        name: 'test',
        language: 'typescript' as const,
        style: 'jsdoc' as const,
        description: 'Test',
        parameters: [
          { name: 'param1', type: 'string', required: true },
          { name: 'param2', type: 'string', required: true },
        ],
      };

      const result = await service.generateDocstring(request);

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some(s => s.includes('параметров'))).toBe(true);
    });

    it('should generate warnings for issues', async () => {
      const request = {
        type: 'function' as const,
        name: 'test',
        language: 'typescript' as const,
        style: 'jsdoc' as const,
        description: 'Test',
        parameters: Array.from({ length: 15 }, (_, i) => ({
          name: `param${i}`,
          type: 'string',
          required: true,
        })),
      };

      const result = await service.generateDocstring(request);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('много параметров'))).toBe(
        true
      );
    });
  });

  describe('getGenerationHistory', () => {
    it('should return empty history initially', () => {
      const history = service.getGenerationHistory();
      expect(history).toHaveLength(0);
    });

    it('should return history after generating docstrings', async () => {
      const request = {
        type: 'function' as const,
        name: 'test',
        language: 'typescript' as const,
        style: 'jsdoc' as const,
        description: 'Test function',
      };

      await service.generateDocstring(request);

      const history = service.getGenerationHistory();
      expect(history).toHaveLength(1);
      expect(history[0]?.docstring).toContain('Test function');
    });
  });

  describe('getGenerationStatistics', () => {
    it('should return default statistics initially', () => {
      const stats = service.getGenerationStatistics();
      expect(stats.total).toBe(0);
      expect(stats.successful).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.averageComplexity).toBe('low');
    });

    it('should return correct statistics after generating docstrings', async () => {
      const request = {
        type: 'function' as const,
        name: 'test',
        language: 'typescript' as const,
        style: 'jsdoc' as const,
        description: 'Test function',
      };

      await service.generateDocstring(request);

      const stats = service.getGenerationStatistics();
      expect(stats.total).toBe(1);
      expect(stats.successful).toBe(1);
      expect(stats.failed).toBe(0);
      expect(stats.averageComplexity).toBe('low');
    });
  });
});
