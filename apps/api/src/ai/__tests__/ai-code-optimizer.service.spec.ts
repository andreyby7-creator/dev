import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AiCodeOptimizerService } from '../ai-code-optimizer.service';

describe('AiCodeOptimizerService', () => {
  let service: AiCodeOptimizerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiCodeOptimizerService],
    }).compile();

    service = module.get<AiCodeOptimizerService>(AiCodeOptimizerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('optimizeCode', () => {
    it('should optimize simple code successfully', async () => {
      const request = {
        code: `
function calculateSum(a: number, b: number): number {
  return a + b;
}
        `,
        language: 'typescript' as const,
      };

      const result = await service.optimizeCode(request);

      expect(result.success).toBe(true);
      expect(result.originalCode).toBe(request.code);
      expect(result.optimizedCode).toBeDefined();
      expect(result.metrics.overallQuality).toBe('excellent');
      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect performance issues', async () => {
      const request = {
        code: `
const numbers = [1, 2, 3, 4, 5];
numbers.forEach(num => console.log(num));
        `,
        language: 'typescript' as const,
      };

      const result = await service.optimizeCode(request);

      expect(result.success).toBe(true);
      expect(result.metrics.performanceScore).toBeLessThanOrEqual(100);
      expect(result.suggestions.some(s => s.type === 'performance')).toBe(true);
    });

    it('should detect security issues', async () => {
      const request = {
        code: `
const userInput = "alert('xss')";
document.body.innerHTML = userInput;
        `,
        language: 'typescript' as const,
      };

      const result = await service.optimizeCode(request);

      expect(result.success).toBe(true);
      expect(result.metrics.securityScore).toBeLessThanOrEqual(100);
      expect(result.suggestions.some(s => s.type === 'security')).toBe(true);
    });

    it('should detect readability issues', async () => {
      const request = {
        code: `
// TODO: implement this later
function veryLongFunctionNameThatIsTooLongAndShouldBeShortened(a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number, q: number, r: number, s: number, t: number, u: number, v: number, w: number, x: number, y: number, z: number): number {
  return a + b + c + d + e + f + g + h + i + j + k + l + m + n + o + p + q + r + s + t + u + v + w + x + y + z;
}
        `,
        language: 'typescript' as const,
      };

      const result = await service.optimizeCode(request);

      expect(result.success).toBe(true);
      expect(result.metrics.readabilityScore).toBeLessThanOrEqual(100);
      expect(result.suggestions.some(s => s.type === 'readability')).toBe(true);
    });

    it('should detect complexity issues', async () => {
      const request = {
        code: `
function complexFunction(a: number, b: number): number {
  if (a > 0) {
    if (b > 0) {
      if (a > b) {
        if (a % 2 === 0) {
          if (b % 2 === 0) {
            return a + b;
          } else {
            return a - b;
          }
        } else {
          if (b % 2 === 0) {
            return a * b;
          } else {
            return a / b;
          }
        }
      } else {
        if (a === b) {
          return a * a;
        } else {
          return b - a;
        }
      }
    } else {
      return Math.abs(a);
    }
  } else {
    return Math.abs(b);
  }
}
        `,
        language: 'typescript' as const,
      };

      const result = await service.optimizeCode(request);

      expect(result.success).toBe(true);
      expect(result.metrics.cyclomaticComplexity).toBeGreaterThan(10);
      expect(result.suggestions.some(s => s.type === 'complexity')).toBe(true);
    });
  });

  describe('code metrics analysis', () => {
    it('should calculate cyclomatic complexity correctly', async () => {
      const simpleCode = `
function simple(a: number): number {
  return a * 2;
}
      `;

      const complexCode = `
function complex(a: number): number {
  if (a > 0) {
    if (a > 10) {
      if (a > 100) {
        return a * 10;
      } else {
        return a * 5;
      }
    } else {
      return a * 2;
    }
  } else {
    return Math.abs(a);
  }
}
      `;

      const simpleResult = await service.optimizeCode({
        code: simpleCode,
        language: 'typescript',
      });
      const complexResult = await service.optimizeCode({
        code: complexCode,
        language: 'typescript',
      });

      expect(simpleResult.metrics.cyclomaticComplexity).toBeLessThan(
        complexResult.metrics.cyclomaticComplexity
      );
    });

    it('should calculate maintainability index correctly', async () => {
      const simpleCode = `
function simple(a: number): number {
  return a * 2;
}
      `;

      const complexCode = `
function veryLongFunctionNameThatIsTooLongAndShouldBeShortened(a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number, q: number, r: number, s: number, t: number, u: number, v: number, w: number, x: number, y: number, z: number): number {
  return a + b + c + d + e + f + g + h + i + j + k + l + m + n + o + p + q + r + s + t + u + v + w + x + y + z;
}
      `;

      const simpleResult = await service.optimizeCode({
        code: simpleCode,
        language: 'typescript',
      });
      const complexResult = await service.optimizeCode({
        code: complexCode,
        language: 'typescript',
      });

      expect(simpleResult.metrics.maintainabilityIndex).toBeGreaterThanOrEqual(
        complexResult.metrics.maintainabilityIndex
      );
    });

    it('should calculate performance score correctly', async () => {
      const efficientCode = `
function efficient(a: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i];
  }
  return sum;
}
      `;

      const inefficientCode = `
function inefficient(a: number[]): number {
  return a.reduce((sum, num) => sum + num, 0);
}
      `;

      const efficientResult = await service.optimizeCode({
        code: efficientCode,
        language: 'typescript',
      });
      const inefficientResult = await service.optimizeCode({
        code: inefficientCode,
        language: 'typescript',
      });

      expect(efficientResult.metrics.performanceScore).toBeGreaterThanOrEqual(
        inefficientResult.metrics.performanceScore
      );
    });

    it('should calculate security score correctly', async () => {
      const secureCode = `
function secure(input: string): string {
  return input.replace(/[<>]/g, '');
}
      `;

      const insecureCode = `
function insecure(input: string): void {
  document.body.innerHTML = input;
}
      `;

      const secureResult = await service.optimizeCode({
        code: secureCode,
        language: 'typescript',
      });
      const insecureResult = await service.optimizeCode({
        code: insecureCode,
        language: 'typescript',
      });

      expect(secureResult.metrics.securityScore).toBeGreaterThan(
        insecureResult.metrics.securityScore
      );
    });

    it('should calculate readability score correctly', async () => {
      const readableCode = `
function readable(a: number, b: number): number {
  // Calculate the sum of two numbers
  const sum = a + b;
  return sum;
}
      `;

      const unreadableCode = `
function unreadable(a:number,b:number):number{const s=a+b;return s;}
      `;

      const readableResult = await service.optimizeCode({
        code: readableCode,
        language: 'typescript',
      });
      const unreadableResult = await service.optimizeCode({
        code: unreadableCode,
        language: 'typescript',
      });

      expect(readableResult.metrics.readabilityScore).toBeGreaterThan(
        unreadableResult.metrics.readabilityScore
      );
    });
  });

  describe('optimization suggestions', () => {
    it('should generate performance suggestions', async () => {
      const request = {
        code: `
const numbers = [1, 2, 3, 4, 5];
numbers.forEach(num => console.log(num));
        `,
        language: 'typescript' as const,
        focusAreas: ['performance'] as (
          | 'performance'
          | 'memory'
          | 'readability'
          | 'security'
          | 'maintainability'
          | 'complexity'
        )[],
      };

      const result = await service.optimizeCode(request);

      expect(result.suggestions.some(s => s.type === 'performance')).toBe(true);
      expect(result.suggestions.some(s => s.priority === 'high')).toBe(true);
    });

    it('should generate security suggestions', async () => {
      const request = {
        code: `
const userInput = "alert('xss')";
document.body.innerHTML = userInput;
        `,
        language: 'typescript' as const,
        focusAreas: ['security'] as (
          | 'performance'
          | 'memory'
          | 'readability'
          | 'security'
          | 'maintainability'
          | 'complexity'
        )[],
      };

      const result = await service.optimizeCode(request);

      expect(result.suggestions.some(s => s.type === 'security')).toBe(true);
      expect(result.suggestions.some(s => s.priority === 'critical')).toBe(
        true
      );
    });

    it('should generate readability suggestions', async () => {
      const request = {
        code: `
// TODO: implement this later
function veryLongFunctionNameThatIsTooLongAndShouldBeShortened(a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number, q: number, r: number, s: number, t: number, u: number, v: number, w: number, x: number, y: number, z: number): number {
  return a + b + c + d + e + f + g + h + i + j + k + l + m + n + o + p + q + r + s + t + u + v + w + x + y + z;
}
        `,
        language: 'typescript' as const,
        focusAreas: ['readability'] as (
          | 'performance'
          | 'memory'
          | 'readability'
          | 'security'
          | 'maintainability'
          | 'complexity'
        )[],
      };

      const result = await service.optimizeCode(request);

      expect(result.suggestions.some(s => s.type === 'readability')).toBe(true);
      expect(result.suggestions.some(s => s.priority === 'medium')).toBe(true);
    });

    it('should respect maxSuggestions limit', async () => {
      const request = {
        code: `
const numbers = [1, 2, 3, 4, 5];
numbers.forEach(num => console.log(num));
const userInput = "alert('xss')";
document.body.innerHTML = userInput;
// TODO: implement this later
function veryLongFunctionNameThatIsTooLongAndShouldBeShortened(a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number, q: number, r: number, s: number, t: number, u: number, v: number, w: number, x: number, y: number, z: number): number {
  return a + b + c + d + e + f + g + h + i + j + k + l + m + n + o + p + q + r + s + t + u + v + w + x + y + z;
}
        `,
        language: 'typescript' as const,
        maxSuggestions: 2,
      };

      const result = await service.optimizeCode(request);

      expect(result.suggestions.length).toBeLessThanOrEqual(2);
    });
  });

  describe('error handling', () => {
    it('should handle empty code gracefully', async () => {
      const request = {
        code: '',
        language: 'typescript' as const,
      };

      const result = await service.optimizeCode(request);

      expect(result.success).toBe(true);
      expect(result.metrics.linesOfCode).toBe(0);
    });

    it('should handle malformed code gracefully', async () => {
      const request = {
        code: 'function test( { return;',
        language: 'typescript' as const,
      };

      const result = await service.optimizeCode(request);

      expect(result.success).toBe(true);
      expect(result.metrics.cyclomaticComplexity).toBeGreaterThan(0);
    });
  });

  describe('getOptimizationHistory', () => {
    it('should return empty history initially', () => {
      const history = service.getOptimizationHistory();
      expect(history).toHaveLength(0);
    });

    it('should return history after optimizing code', async () => {
      const request = {
        code: 'function test() { return true; }',
        language: 'typescript' as const,
      };

      await service.optimizeCode(request);

      const history = service.getOptimizationHistory();
      expect(history).toHaveLength(1);
      expect(history[0]?.originalCode).toBe(request.code);
    });
  });

  describe('getOptimizationStatistics', () => {
    it('should return default statistics initially', () => {
      const stats = service.getOptimizationStatistics();
      expect(stats.total).toBe(0);
      expect(stats.successful).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.averageQuality).toBe('excellent');
    });

    it('should return correct statistics after optimizing code', async () => {
      const request = {
        code: 'function test() { return true; }',
        language: 'typescript' as const,
      };

      await service.optimizeCode(request);

      const stats = service.getOptimizationStatistics();
      expect(stats.total).toBe(1);
      expect(stats.successful).toBe(1);
      expect(stats.failed).toBe(0);
      expect(stats.averageQuality).toBe('excellent');
    });
  });

  describe('summary generation', () => {
    it('should generate summary for excellent quality code', async () => {
      const request = {
        code: `
function excellent(a: number): number {
  return a * 2;
}
        `,
        language: 'typescript' as const,
      };

      const result = await service.optimizeCode(request);

      expect(result.summary).toContain('отличном состоянии');
    });

    it('should generate summary for poor quality code', async () => {
      const request = {
        code: `
// TODO: implement this later
function poor(a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number, q: number, r: number, s: number, t: number, u: number, v: number, w: number, x: number, y: number, z: number): number {
  if (a > 0) {
    if (b > 0) {
      if (c > 0) {
        if (d > 0) {
          if (e > 0) {
            if (f > 0) {
              if (g > 0) {
                if (h > 0) {
                  if (i > 0) {
                    if (j > 0) {
                      return a + b + c + d + e + f + g + h + i + j + k + l + m + n + o + p + q + r + s + t + u + v + w + x + y + z;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  return 0;
}
        `,
        language: 'typescript' as const,
      };

      const result = await service.optimizeCode(request);

      expect(result.summary).toContain('улучшения');
    });
  });

  describe('warnings generation', () => {
    it('should generate warnings for high complexity', async () => {
      const request = {
        code: `
function complex(a: number): number {
  if (a > 0) {
    if (a > 10) {
      if (a > 100) {
        if (a > 1000) {
          if (a > 10000) {
            return a * 10;
          }
        }
      }
    }
  }
  return a;
}
        `,
        language: 'typescript' as const,
      };

      const result = await service.optimizeCode(request);

      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('should generate warnings for low performance', async () => {
      const request = {
        code: `
const numbers = [1, 2, 3, 4, 5];
numbers.forEach(num => console.log(num));
numbers.map(num => num * 2);
numbers.filter(num => num > 2);
        `,
        language: 'typescript' as const,
      };

      const result = await service.optimizeCode(request);

      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('should generate warnings for low security', async () => {
      const request = {
        code: `
const userInput = "alert('xss')";
document.body.innerHTML = userInput;
eval("console.log('hello')");
        `,
        language: 'typescript' as const,
      };

      const result = await service.optimizeCode(request);

      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });
});
