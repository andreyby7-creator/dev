import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AiCommitAnalyzerService } from '../ai-commit-analyzer.service';

describe('AiCommitAnalyzerService', () => {
  let service: AiCommitAnalyzerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiCommitAnalyzerService],
    }).compile();

    service = module.get<AiCommitAnalyzerService>(AiCommitAnalyzerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeCommit', () => {
    it('should analyze a valid conventional commit', async () => {
      const request = {
        commitHash: 'abc123',
        message: 'feat(auth): add JWT authentication',
        files: ['src/auth/auth.service.ts'],
        author: 'developer',
        timestamp: '2024-01-01T00:00:00Z',
      };

      const result = await service.analyzeCommit(request);

      expect(result.isValid).toBe(true);
      expect(result.canCommit).toBe(true);
      expect(result.analysis.type).toBe('feat');
      expect(result.analysis.scope).toBe('auth');
      expect(result.analysis.score).toBeGreaterThan(70);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid conventional commit', async () => {
      const request = {
        commitHash: 'abc123',
        message: 'just some changes',
        files: ['src/auth/auth.service.ts'],
        author: 'developer',
        timestamp: '2024-01-01T00:00:00Z',
      };

      const result = await service.analyzeCommit(request);

      expect(result.isValid).toBe(false);
      expect(result.canCommit).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.analysis.score).toBeLessThan(70);
    });

    it('should detect security issues in diff', async () => {
      const request = {
        commitHash: 'abc123',
        message: 'feat(auth): add authentication',
        files: ['src/auth/auth.service.ts'],
        diff: 'const password = "hardcoded123";',
        author: 'developer',
        timestamp: '2024-01-01T00:00:00Z',
      };

      const result = await service.analyzeCommit(request);

      expect(
        result.analysis.issues.some(issue => issue.type === 'security')
      ).toBe(true);
      expect(result.analysis.severity).toBe('high');
    });

    it('should warn about too many changed files', async () => {
      const request = {
        commitHash: 'abc123',
        message: 'feat: major refactoring',
        files: Array.from({ length: 25 }, (_, i) => `src/file${i}.ts`),
        author: 'developer',
        timestamp: '2024-01-01T00:00:00Z',
      };

      const result = await service.analyzeCommit(request);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.analysis.score).toBeLessThan(80);
    });
  });

  describe('getCommitHistory', () => {
    it('should return empty history initially', () => {
      const history = service.getCommitHistory();
      expect(history).toHaveLength(0);
    });

    it('should return history after analyzing commits', async () => {
      const request = {
        commitHash: 'abc123',
        message: 'feat(auth): add JWT authentication',
        files: ['src/auth/auth.service.ts'],
        author: 'developer',
        timestamp: '2024-01-01T00:00:00Z',
      };

      await service.analyzeCommit(request);

      const history = service.getCommitHistory();
      expect(history).toHaveLength(1);
      expect(history[0]?.commitHash).toBe('abc123');
    });
  });

  describe('getCommitStatistics', () => {
    it('should return default statistics initially', () => {
      const stats = service.getCommitStatistics();
      expect(stats.total).toBe(0);
      expect(stats.valid).toBe(0);
      expect(stats.invalid).toBe(0);
      expect(stats.averageScore).toBe(0);
    });

    it('should return correct statistics after analyzing commits', async () => {
      const validCommit = {
        commitHash: 'abc123',
        message: 'feat(auth): add JWT authentication',
        files: ['src/auth/auth.service.ts'],
        author: 'developer',
        timestamp: '2024-01-01T00:00:00Z',
      };

      const invalidCommit = {
        commitHash: 'def456',
        message: 'just some changes',
        files: ['src/auth/auth.service.ts'],
        author: 'developer',
        timestamp: '2024-01-01T00:00:00Z',
      };

      await service.analyzeCommit(validCommit);
      await service.analyzeCommit(invalidCommit);

      const stats = service.getCommitStatistics();
      expect(stats.total).toBe(2);
      expect(stats.valid).toBe(1);
      expect(stats.invalid).toBe(1);
      expect(stats.averageScore).toBeGreaterThan(0);
    });
  });

  describe('commit validation rules', () => {
    it('should validate conventional commit types', async () => {
      const validTypes = [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'test',
        'chore',
        'perf',
        'ci',
        'build',
        'revert',
      ];

      for (const type of validTypes) {
        const request = {
          commitHash: 'abc123',
          message: `${type}: valid commit message`,
          files: ['src/file.ts'],
          author: 'developer',
          timestamp: '2024-01-01T00:00:00Z',
        };

        const result = await service.analyzeCommit(request);
        expect(result.analysis.type).toBe(type);
      }
    });

    it('should reject invalid commit types', async () => {
      const request = {
        commitHash: 'abc123',
        message: 'invalid: this is not a valid type',
        files: ['src/file.ts'],
        author: 'developer',
        timestamp: '2024-01-01T00:00:00Z',
      };

      const result = await service.analyzeCommit(request);
      expect(
        result.analysis.issues.some(issue => issue.type === 'convention')
      ).toBe(true);
    });

    it('should validate commit message length', async () => {
      const longMessage = 'feat(auth): ' + 'a'.repeat(100);
      const request = {
        commitHash: 'abc123',
        message: longMessage,
        files: ['src/file.ts'],
        author: 'developer',
        timestamp: '2024-01-01T00:00:00Z',
      };

      const result = await service.analyzeCommit(request);
      expect(
        result.analysis.issues.some(issue =>
          issue.description.includes('длинное')
        )
      ).toBe(true);
    });
  });

  describe('security analysis', () => {
    it('should detect hardcoded passwords', async () => {
      const request = {
        commitHash: 'abc123',
        message: 'feat(auth): add authentication',
        files: ['src/auth/auth.service.ts'],
        diff: 'const password = "secret123";',
        author: 'developer',
        timestamp: '2024-01-01T00:00:00Z',
      };

      const result = await service.analyzeCommit(request);
      expect(
        result.analysis.issues.some(issue => issue.severity === 'high')
      ).toBe(true);
    });

    it('should detect TODO comments', async () => {
      const request = {
        commitHash: 'abc123',
        message: 'feat(auth): add authentication',
        files: ['src/auth/auth.service.ts'],
        diff: '// TODO: implement this later',
        author: 'developer',
        timestamp: '2024-01-01T00:00:00Z',
      };

      const result = await service.analyzeCommit(request);
      expect(
        result.analysis.issues.some(issue => issue.type === 'quality')
      ).toBe(true);
    });

    it('should detect console.log statements', async () => {
      const request = {
        commitHash: 'abc123',
        message: 'feat(auth): add authentication',
        files: ['src/auth/auth.service.ts'],
        diff: 'console.log("debug info");',
        author: 'developer',
        timestamp: '2024-01-01T00:00:00Z',
      };

      const result = await service.analyzeCommit(request);
      expect(
        result.analysis.issues.some(issue => issue.type === 'quality')
      ).toBe(true);
    });
  });
});
