import { Injectable, Logger } from '@nestjs/common';

// Типы для интерактивного обучения
export type LearningTopic =
  | 'typescript'
  | 'nestjs'
  | 'testing'
  | 'code_quality'
  | 'security'
  | 'performance'
  | 'architecture'
  | 'best_practices';

export type LearningLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type LearningFormat =
  | 'tutorial'
  | 'quiz'
  | 'exercise'
  | 'code_review'
  | 'pair_programming';

export interface ILearningRequest {
  topic: LearningTopic;
  level: LearningLevel;
  format: LearningFormat;
  context?: string;
  specificQuestions?: string[];
  codeExamples?: string[];
  timeLimit?: number; // в минутах
}

export interface ILearningResult {
  success: boolean;
  content: ILearningContent;
  progress: ILearningProgress;
  recommendations: ILearningRecommendation[];
  summary: string;
  nextSteps: string[];
}

export interface ILearningContent {
  title: string;
  description: string;
  sections: ILearningSection[];
  exercises: ILearningExercise[];
  quizzes: ILearningQuiz[];
  examples: ILearningExample[];
  resources: ILearningResource[];
}

export interface ILearningSection {
  id: string;
  title: string;
  content: string;
  order: number;
  prerequisites?: string[];
  estimatedTime: number; // в минутах
  difficulty: LearningLevel;
}

export interface ILearningExercise {
  id: string;
  title: string;
  description: string;
  type: 'coding' | 'multiple_choice' | 'fill_blank' | 'code_review';
  difficulty: LearningLevel;
  estimatedTime: number;
  starterCode?: string;
  expectedOutput?: string;
  hints: string[];
  solution: string;
  explanation: string;
}

export interface ILearningQuiz {
  id: string;
  title: string;
  questions: IQuizQuestion[];
  passingScore: number;
  timeLimit?: number;
}

export interface IQuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'code_completion';
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  difficulty: LearningLevel;
}

export interface ILearningExample {
  id: string;
  title: string;
  description: string;
  code: string;
  language: 'typescript' | 'javascript' | 'json';
  explanation: string;
  bestPractices: string[];
  antiPatterns: string[];
}

export interface ILearningResource {
  id: string;
  title: string;
  type: 'documentation' | 'video' | 'article' | 'book' | 'tool';
  url?: string;
  description: string;
  difficulty: LearningLevel;
  estimatedTime: number;
}

export interface ILearningProgress {
  currentSection: number;
  totalSections: number;
  completedExercises: number;
  totalExercises: number;
  completedQuizzes: number;
  totalQuizzes: number;
  score: number;
  timeSpent: number; // в минутах
  mastery: Record<LearningTopic, number>; // 0-100
}

export interface ILearningRecommendation {
  id: string;
  type: 'next_topic' | 'practice' | 'review' | 'advanced';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  estimatedTime: number;
  prerequisites?: string[];
}

@Injectable()
export class InteractiveLearningService {
  private readonly logger = new Logger(InteractiveLearningService.name);
  private readonly learningProgress = new Map<string, ILearningProgress>();

  /**
   * Создает персонализированное обучение
   */
  async createLearningSession(
    request: ILearningRequest
  ): Promise<ILearningResult> {
    this.logger.log('Creating interactive learning session', {
      topic: request.topic,
      level: request.level,
      format: request.format,
    });

    try {
      const content = await this.generateLearningContent(request);
      const progress = this.initializeProgress();
      const recommendations = this.generateRecommendations(request);

      const result: ILearningResult = {
        success: true,
        content,
        progress,
        recommendations,
        summary: this.generateSummary(content),
        nextSteps: this.generateNextSteps(request, recommendations),
      };

      this.logger.log('Interactive learning session created', {
        sectionsCount: content.sections.length,
        exercisesCount: content.exercises.length,
        quizzesCount: content.quizzes.length,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to create learning session', error);
      return {
        success: false,
        content: this.getEmptyContent(),
        progress: this.getEmptyProgress(),
        recommendations: [],
        summary: 'Learning session creation failed',
        nextSteps: ['Try again with different parameters'],
      };
    }
  }

  /**
   * Проверяет прогресс обучения
   */
  async checkProgress(sessionId: string): Promise<ILearningProgress> {
    const progress = this.learningProgress.get(sessionId);
    if (!progress) {
      throw new Error(`Learning session not found: ${sessionId}`);
    }

    return progress;
  }

  /**
   * Обновляет прогресс обучения
   */
  async updateProgress(
    sessionId: string,
    updates: Partial<ILearningProgress>
  ): Promise<ILearningProgress> {
    const currentProgress = this.learningProgress.get(sessionId);
    if (!currentProgress) {
      throw new Error(`Learning session not found: ${sessionId}`);
    }

    const updatedProgress: ILearningProgress = {
      ...currentProgress,
      ...updates,
    };

    this.learningProgress.set(sessionId, updatedProgress);
    this.logger.log('Learning progress updated', { sessionId, updates });

    return updatedProgress;
  }

  /**
   * Создает упражнение по коду
   */
  async createCodeExercise(
    topic: LearningTopic,
    level: LearningLevel,
    codeExample?: string
  ): Promise<ILearningExercise> {
    this.logger.log('Creating code exercise', { topic, level });

    const exercise = this.generateCodeExercise(topic, level, codeExample);
    return exercise;
  }

  /**
   * Создает викторину
   */
  async createQuiz(
    topic: LearningTopic,
    level: LearningLevel
  ): Promise<ILearningQuiz> {
    this.logger.log('Creating quiz', { topic, level });

    const quiz = this.generateQuiz(topic, level);
    return quiz;
  }

  /**
   * Анализирует код и предоставляет обратную связь
   */
  async analyzeCode(
    _code: string,
    topic: LearningTopic,
    level: LearningLevel
  ): Promise<ICodeAnalysis> {
    this.logger.log('Analyzing code for learning feedback', { topic, level });

    const analysis = this.performCodeAnalysis();
    return analysis;
  }

  /**
   * Генерирует рекомендации по обучению
   */
  async generateLearningPath(
    currentSkills: Record<LearningTopic, LearningLevel>,
    goals: LearningTopic[]
  ): Promise<ILearningPath> {
    this.logger.log('Generating learning path', { currentSkills, goals });

    const path = this.createLearningPath();
    return path;
  }

  /**
   * Генерирует контент для обучения
   */
  private async generateLearningContent(
    request: ILearningRequest
  ): Promise<ILearningContent> {
    const content: ILearningContent = {
      title: this.generateTitle(request.topic, request.level),
      description: this.generateDescription(request.topic, request.level),
      sections: this.generateSections(request),
      exercises: this.generateExercises(request),
      quizzes: this.generateQuizzes(request),
      examples: this.generateExamples(request),
      resources: this.generateResources(request),
    };

    return content;
  }

  /**
   * Инициализирует прогресс обучения
   */
  private initializeProgress(): ILearningProgress {
    const progress: ILearningProgress = {
      currentSection: 0,
      totalSections: 0,
      completedExercises: 0,
      totalExercises: 0,
      completedQuizzes: 0,
      totalQuizzes: 0,
      score: 0,
      timeSpent: 0,
      mastery: {
        typescript: 0,
        nestjs: 0,
        testing: 0,
        code_quality: 0,
        security: 0,
        performance: 0,
        architecture: 0,
        best_practices: 0,
      },
    };

    return progress;
  }

  /**
   * Генерирует рекомендации
   */
  private generateRecommendations(
    request: ILearningRequest
  ): ILearningRecommendation[] {
    const recommendations: ILearningRecommendation[] = [];

    // Рекомендации на основе уровня
    if (request.level === 'beginner') {
      recommendations.push({
        id: 'practice_basics',
        type: 'practice',
        title: 'Practice Basic Concepts',
        description:
          'Spend more time practicing basic concepts before moving to advanced topics',
        priority: 'high',
        estimatedTime: 30,
      });
    }

    // Рекомендации на основе темы
    if (request.topic === 'testing') {
      recommendations.push({
        id: 'learn_testing_patterns',
        type: 'next_topic',
        title: 'Learn Testing Patterns',
        description: 'Study common testing patterns and best practices',
        priority: 'medium',
        estimatedTime: 45,
        prerequisites: ['testing'],
      });
    }

    return recommendations;
  }

  // Методы генерации контента
  private generateTitle(topic: LearningTopic, level: LearningLevel): string {
    const topicNames = {
      typescript: 'TypeScript',
      nestjs: 'NestJS',
      testing: 'Testing',
      code_quality: 'Code Quality',
      security: 'Security',
      performance: 'Performance',
      architecture: 'Architecture',
      best_practices: 'Best Practices',
    };

    const levelNames = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      expert: 'Expert',
    };

    return `${topicNames[topic]} - ${levelNames[level]} Level`;
  }

  private generateDescription(
    topic: LearningTopic,
    level: LearningLevel
  ): string {
    const descriptions = {
      typescript: {
        beginner: 'Learn the fundamentals of TypeScript programming',
        intermediate: 'Master advanced TypeScript features and patterns',
        advanced: 'Become an expert in TypeScript development',
        expert: 'Lead TypeScript projects and mentor others',
      },
      nestjs: {
        beginner: 'Get started with NestJS framework',
        intermediate: 'Build robust applications with NestJS',
        advanced: 'Master NestJS architecture and patterns',
        expert: 'Design enterprise-grade NestJS applications',
      },
      testing: {
        beginner: 'Learn the basics of software testing',
        intermediate: 'Master testing strategies and tools',
        advanced: 'Design comprehensive test suites',
        expert: 'Lead testing initiatives and quality assurance',
      },
    };

    return (
      descriptions[topic as keyof typeof descriptions][level] ||
      'Learn and improve your skills'
    );
  }

  private generateSections(request: ILearningRequest): ILearningSection[] {
    const sections: ILearningSection[] = [];

    switch (request.topic) {
      case 'typescript':
        sections.push(...this.generateTypeScriptSections(request.level));
        break;
      case 'nestjs':
        sections.push(...this.generateNestJSSections(request.level));
        break;
      case 'testing':
        sections.push(...this.generateTestingSections(request.level));
        break;
      case 'code_quality':
        sections.push(...this.generateCodeQualitySections(request.level));
        break;
      case 'security':
        sections.push(...this.generateSecuritySections(request.level));
        break;
      case 'performance':
        sections.push(...this.generatePerformanceSections(request.level));
        break;
      case 'architecture':
        sections.push(...this.generateArchitectureSections(request.level));
        break;
      case 'best_practices':
        sections.push(...this.generateBestPracticesSections(request.level));
        break;
    }

    return sections;
  }

  private generateTypeScriptSections(level: LearningLevel): ILearningSection[] {
    const sections: ILearningSection[] = [];

    if (level === 'beginner') {
      sections.push(
        {
          id: 'ts-basics',
          title: 'TypeScript Basics',
          content:
            'Learn about types, interfaces, and basic TypeScript features',
          order: 1,
          estimatedTime: 30,
          difficulty: 'beginner',
        },
        {
          id: 'ts-functions',
          title: 'Functions and Classes',
          content: 'Master function types, classes, and inheritance',
          order: 2,
          prerequisites: ['ts-basics'],
          estimatedTime: 45,
          difficulty: 'beginner',
        }
      );
    } else if (level === 'intermediate') {
      sections.push(
        {
          id: 'ts-advanced-types',
          title: 'Advanced Types',
          content:
            'Learn about generics, utility types, and advanced type features',
          order: 1,
          estimatedTime: 60,
          difficulty: 'intermediate',
        },
        {
          id: 'ts-decorators',
          title: 'Decorators and Metadata',
          content: 'Master decorators and reflection metadata',
          order: 2,
          prerequisites: ['ts-advanced-types'],
          estimatedTime: 45,
          difficulty: 'intermediate',
        }
      );
    }

    return sections;
  }

  private generateNestJSSections(level: LearningLevel): ILearningSection[] {
    const sections: ILearningSection[] = [];

    if (level === 'beginner') {
      sections.push(
        {
          id: 'nestjs-basics',
          title: 'NestJS Fundamentals',
          content: 'Learn about modules, controllers, and services',
          order: 1,
          estimatedTime: 45,
          difficulty: 'beginner',
        },
        {
          id: 'nestjs-dependency-injection',
          title: 'Dependency Injection',
          content: 'Master dependency injection and providers',
          order: 2,
          prerequisites: ['nestjs-basics'],
          estimatedTime: 30,
          difficulty: 'beginner',
        }
      );
    } else if (level === 'intermediate') {
      sections.push(
        {
          id: 'nestjs-guards',
          title: 'Guards and Middleware',
          content: 'Learn about guards, middleware, and interceptors',
          order: 1,
          estimatedTime: 60,
          difficulty: 'intermediate',
        },
        {
          id: 'nestjs-database',
          title: 'Database Integration',
          content: 'Master database integration with TypeORM',
          order: 2,
          prerequisites: ['nestjs-guards'],
          estimatedTime: 90,
          difficulty: 'intermediate',
        }
      );
    }

    return sections;
  }

  private generateTestingSections(level: LearningLevel): ILearningSection[] {
    const sections: ILearningSection[] = [];

    if (level === 'beginner') {
      sections.push(
        {
          id: 'testing-basics',
          title: 'Testing Fundamentals',
          content:
            'Learn about unit testing, integration testing, and test structure',
          order: 1,
          estimatedTime: 45,
          difficulty: 'beginner',
        },
        {
          id: 'jest-basics',
          title: 'Jest Testing Framework',
          content: 'Master Jest testing framework and its features',
          order: 2,
          prerequisites: ['testing-basics'],
          estimatedTime: 60,
          difficulty: 'beginner',
        }
      );
    } else if (level === 'intermediate') {
      sections.push(
        {
          id: 'testing-patterns',
          title: 'Testing Patterns',
          content: 'Learn about mocking, stubbing, and test patterns',
          order: 1,
          estimatedTime: 75,
          difficulty: 'intermediate',
        },
        {
          id: 'e2e-testing',
          title: 'End-to-End Testing',
          content: 'Master E2E testing with Cypress or Playwright',
          order: 2,
          prerequisites: ['testing-patterns'],
          estimatedTime: 90,
          difficulty: 'intermediate',
        }
      );
    }

    return sections;
  }

  private generateCodeQualitySections(
    level: LearningLevel
  ): ILearningSection[] {
    return [
      {
        id: 'code-quality-basics',
        title: 'Code Quality Fundamentals',
        content: 'Learn about clean code principles and best practices',
        order: 1,
        estimatedTime: 45,
        difficulty: level,
      },
    ];
  }

  private generateSecuritySections(level: LearningLevel): ILearningSection[] {
    return [
      {
        id: 'security-basics',
        title: 'Security Fundamentals',
        content: 'Learn about common security vulnerabilities and prevention',
        order: 1,
        estimatedTime: 60,
        difficulty: level,
      },
    ];
  }

  private generatePerformanceSections(
    level: LearningLevel
  ): ILearningSection[] {
    return [
      {
        id: 'performance-basics',
        title: 'Performance Optimization',
        content:
          'Learn about performance monitoring and optimization techniques',
        order: 1,
        estimatedTime: 75,
        difficulty: level,
      },
    ];
  }

  private generateArchitectureSections(
    level: LearningLevel
  ): ILearningSection[] {
    return [
      {
        id: 'architecture-basics',
        title: 'Software Architecture',
        content: 'Learn about architectural patterns and design principles',
        order: 1,
        estimatedTime: 90,
        difficulty: level,
      },
    ];
  }

  private generateBestPracticesSections(
    level: LearningLevel
  ): ILearningSection[] {
    return [
      {
        id: 'best-practices-basics',
        title: 'Best Practices',
        content: 'Learn about industry best practices and coding standards',
        order: 1,
        estimatedTime: 60,
        difficulty: level,
      },
    ];
  }

  private generateExercises(request: ILearningRequest): ILearningExercise[] {
    const exercises: ILearningExercise[] = [];

    // Генерируем упражнения на основе темы и уровня
    switch (request.topic) {
      case 'typescript':
        exercises.push(...this.generateTypeScriptExercises(request.level));
        break;
      case 'nestjs':
        exercises.push(...this.generateNestJSExercises(request.level));
        break;
      case 'testing':
        exercises.push(...this.generateTestingExercises(request.level));
        break;
    }

    return exercises;
  }

  private generateTypeScriptExercises(
    level: LearningLevel
  ): ILearningExercise[] {
    const exercises: ILearningExercise[] = [];

    if (level === 'beginner') {
      exercises.push({
        id: 'ts-exercise-1',
        title: 'Create a TypeScript Interface',
        description:
          'Create an interface for a User object with name, email, and age properties',
        type: 'coding',
        difficulty: 'beginner',
        estimatedTime: 15,
        starterCode:
          '// Create a User interface here\ninterface User {\n  // Add properties here\n}',
        expectedOutput:
          'interface User {\n  name: string;\n  email: string;\n  age: number;\n}',
        hints: [
          'Use string type for name and email',
          'Use number type for age',
          'Make sure all properties are required',
        ],
        solution:
          'interface User {\n  name: string;\n  email: string;\n  age: number;\n}',
        explanation:
          'This interface defines the structure of a User object with three required properties.',
      });
    }

    return exercises;
  }

  private generateNestJSExercises(level: LearningLevel): ILearningExercise[] {
    const exercises: ILearningExercise[] = [];

    if (level === 'beginner') {
      exercises.push({
        id: 'nestjs-exercise-1',
        title: 'Create a NestJS Controller',
        description: 'Create a simple controller with a GET endpoint',
        type: 'coding',
        difficulty: 'beginner',
        estimatedTime: 20,
        starterCode:
          "import { Controller, Get } from '@nestjs/common';\n\n@Controller('users')\nexport class UsersController {\n  // Add GET endpoint here\n}",
        expectedOutput:
          "@Get()\nfindAll() {\n  return 'This action returns all users';\n}",
        hints: [
          'Use @Get() decorator',
          'Create a method called findAll',
          'Return a simple string message',
        ],
        solution:
          "@Get()\nfindAll() {\n  return 'This action returns all users';\n}",
        explanation:
          'This creates a simple GET endpoint that returns a message.',
      });
    }

    return exercises;
  }

  private generateTestingExercises(level: LearningLevel): ILearningExercise[] {
    const exercises: ILearningExercise[] = [];

    if (level === 'beginner') {
      exercises.push({
        id: 'testing-exercise-1',
        title: 'Write a Simple Test',
        description: 'Write a test for a simple function that adds two numbers',
        type: 'coding',
        difficulty: 'beginner',
        estimatedTime: 15,
        starterCode:
          "function add(a: number, b: number): number {\n  return a + b;\n}\n\n// Write test here\ndescribe('add', () => {\n  // Add test case here\n});",
        expectedOutput:
          "it('should add two numbers', () => {\n  expect(add(2, 3)).toBe(5);\n});",
        hints: [
          'Use it() to create a test case',
          'Use expect() to make assertions',
          'Test with simple numbers like 2 and 3',
        ],
        solution:
          "it('should add two numbers', () => {\n  expect(add(2, 3)).toBe(5);\n});",
        explanation:
          'This test verifies that the add function correctly adds two numbers.',
      });
    }

    return exercises;
  }

  private generateQuizzes(request: ILearningRequest): ILearningQuiz[] {
    const quizzes: ILearningQuiz[] = [];

    // Генерируем викторины на основе темы
    switch (request.topic) {
      case 'typescript':
        quizzes.push(this.generateTypeScriptQuiz());
        break;
      case 'nestjs':
        quizzes.push(this.generateNestJSQuiz());
        break;
      case 'testing':
        quizzes.push(this.generateTestingQuiz());
        break;
    }

    return quizzes;
  }

  private generateTypeScriptQuiz(): ILearningQuiz {
    return {
      id: 'ts-quiz-1',
      title: 'TypeScript Fundamentals Quiz',
      questions: [
        {
          id: 'ts-q1',
          question: 'What is the main benefit of TypeScript?',
          type: 'multiple_choice',
          options: [
            'Faster execution',
            'Static type checking',
            'Smaller file size',
            'Better browser compatibility',
          ],
          correctAnswer: 'Static type checking',
          explanation:
            'TypeScript provides static type checking at compile time.',
          difficulty: 'beginner',
        },
        {
          id: 'ts-q2',
          question:
            'Which keyword is used to define an interface in TypeScript?',
          type: 'multiple_choice',
          options: ['class', 'interface', 'type', 'struct'],
          correctAnswer: 'interface',
          explanation:
            'The interface keyword is used to define interfaces in TypeScript.',
          difficulty: 'beginner',
        },
      ],
      passingScore: 70,
      timeLimit: 10,
    };
  }

  private generateNestJSQuiz(): ILearningQuiz {
    return {
      id: 'nestjs-quiz-1',
      title: 'NestJS Fundamentals Quiz',
      questions: [
        {
          id: 'nestjs-q1',
          question: 'What is the main purpose of a NestJS module?',
          type: 'multiple_choice',
          options: [
            'To define routes',
            'To organize related functionality',
            'To handle HTTP requests',
            'To manage database connections',
          ],
          correctAnswer: 'To organize related functionality',
          explanation:
            'Modules in NestJS are used to organize related functionality and providers.',
          difficulty: 'beginner',
        },
      ],
      passingScore: 70,
      timeLimit: 10,
    };
  }

  private generateTestingQuiz(): ILearningQuiz {
    return {
      id: 'testing-quiz-1',
      title: 'Testing Fundamentals Quiz',
      questions: [
        {
          id: 'testing-q1',
          question: 'What is the purpose of unit testing?',
          type: 'multiple_choice',
          options: [
            'To test the entire application',
            'To test individual functions or methods',
            'To test database connections',
            'To test user interfaces',
          ],
          correctAnswer: 'To test individual functions or methods',
          explanation:
            'Unit testing focuses on testing individual functions or methods in isolation.',
          difficulty: 'beginner',
        },
      ],
      passingScore: 70,
      timeLimit: 10,
    };
  }

  private generateExamples(request: ILearningRequest): ILearningExample[] {
    const examples: ILearningExample[] = [];

    // Генерируем примеры на основе темы
    switch (request.topic) {
      case 'typescript':
        examples.push(...this.generateTypeScriptExamples());
        break;
      case 'nestjs':
        examples.push(...this.generateNestJSExamples());
        break;
      case 'testing':
        examples.push(...this.generateTestingExamples());
        break;
    }

    return examples;
  }

  private generateTypeScriptExamples(): ILearningExample[] {
    return [
      {
        id: 'ts-example-1',
        title: 'TypeScript Interface Example',
        description: 'Example of defining and using a TypeScript interface',
        code: `interface User {
  name: string;
  email: string;
  age: number;
}

const user: User = {
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
};`,
        language: 'typescript',
        explanation:
          'This example shows how to define an interface and use it to type an object.',
        bestPractices: [
          'Use descriptive property names',
          'Make properties required unless they are optional',
          'Use specific types instead of any',
        ],
        antiPatterns: [
          'Using any type for properties',
          'Making all properties optional',
          'Using unclear property names',
        ],
      },
    ];
  }

  private generateNestJSExamples(): ILearningExample[] {
    return [
      {
        id: 'nestjs-example-1',
        title: 'NestJS Controller Example',
        description: 'Example of a simple NestJS controller',
        code: `import { Controller, Get, Post, Body } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  findAll() {
    return 'This action returns all users';
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return 'This action creates a new user';
  }
}`,
        language: 'typescript',
        explanation:
          'This example shows a basic NestJS controller with GET and POST endpoints.',
        bestPractices: [
          'Use DTOs for request validation',
          'Keep controllers thin',
          'Use proper HTTP decorators',
        ],
        antiPatterns: [
          'Putting business logic in controllers',
          'Not using DTOs for validation',
          'Not handling errors properly',
        ],
      },
    ];
  }

  private generateTestingExamples(): ILearningExample[] {
    return [
      {
        id: 'testing-example-1',
        title: 'Jest Test Example',
        description: 'Example of a simple Jest test',
        code: `describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
  });

  it('should create a user', () => {
    const user = userService.createUser('John', 'john@example.com');
    expect(user.name).toBe('John');
    expect(user.email).toBe('john@example.com');
  });
});`,
        language: 'typescript',
        explanation:
          'This example shows how to structure a Jest test with setup and assertions.',
        bestPractices: [
          'Use descriptive test names',
          'Set up test data in beforeEach',
          'Test one thing at a time',
          'Use meaningful assertions',
        ],
        antiPatterns: [
          'Testing multiple things in one test',
          'Not cleaning up test data',
          'Using unclear test names',
          'Not handling async operations properly',
        ],
      },
    ];
  }

  private generateResources(request: ILearningRequest): ILearningResource[] {
    const resources: ILearningResource[] = [];

    // Генерируем ресурсы на основе темы
    switch (request.topic) {
      case 'typescript':
        resources.push({
          id: 'ts-docs',
          title: 'TypeScript Official Documentation',
          type: 'documentation',
          url: 'https://www.typescriptlang.org/docs/',
          description: 'Official TypeScript documentation and guides',
          difficulty: 'beginner',
          estimatedTime: 120,
        });
        break;
      case 'nestjs':
        resources.push({
          id: 'nestjs-docs',
          title: 'NestJS Official Documentation',
          type: 'documentation',
          url: 'https://docs.nestjs.com/',
          description: 'Official NestJS documentation and guides',
          difficulty: 'beginner',
          estimatedTime: 180,
        });
        break;
      case 'testing':
        resources.push({
          id: 'jest-docs',
          title: 'Jest Documentation',
          type: 'documentation',
          url: 'https://jestjs.io/docs/getting-started',
          description: 'Official Jest testing framework documentation',
          difficulty: 'beginner',
          estimatedTime: 90,
        });
        break;
    }

    return resources;
  }

  private generateCodeExercise(
    topic: LearningTopic,
    level: LearningLevel,
    codeExample?: string
  ): ILearningExercise {
    return {
      id: `exercise-${topic}-${level}`,
      title: `${topic} Exercise`,
      description: `Practice ${topic} concepts`,
      type: 'coding',
      difficulty: level,
      estimatedTime: 30,
      starterCode: codeExample ?? '// Start coding here',
      expectedOutput: 'Expected output here',
      hints: ['Hint 1', 'Hint 2'],
      solution: 'Solution code here',
      explanation: 'Explanation of the solution',
    };
  }

  private generateQuiz(
    topic: LearningTopic,
    level: LearningLevel
  ): ILearningQuiz {
    return {
      id: `quiz-${topic}-${level}`,
      title: `${topic} Quiz`,
      questions: [
        {
          id: 'q1',
          question: 'Sample question?',
          type: 'multiple_choice',
          options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
          correctAnswer: 'Option 1',
          explanation: 'Explanation of the correct answer',
          difficulty: level,
        },
      ],
      passingScore: 70,
      timeLimit: 10,
    };
  }

  private performCodeAnalysis(): ICodeAnalysis {
    return {
      quality: 'good',
      issues: [],
      suggestions: [],
      score: 85,
      feedback: 'Good code structure and practices',
    };
  }

  private createLearningPath(): ILearningPath {
    return {
      id: 'learning-path-1',
      title: 'Personalized Learning Path',
      description: 'Customized learning path based on your skills and goals',
      steps: [],
      estimatedTime: 0,
      difficulty: 'intermediate',
    };
  }

  private generateSummary(content: ILearningContent): string {
    return `Learning session created with ${content.sections.length} sections, ${content.exercises.length} exercises, and ${content.quizzes.length} quizzes.`;
  }

  private generateNextSteps(
    _request: ILearningRequest,
    recommendations: ILearningRecommendation[]
  ): string[] {
    const steps: string[] = [];

    steps.push('Start with the first section');
    steps.push('Complete the exercises');
    steps.push('Take the quizzes');

    if (recommendations.length > 0) {
      steps.push('Review the recommendations');
    }

    return steps;
  }

  private getEmptyContent(): ILearningContent {
    return {
      title: 'Empty Content',
      description: 'No content available',
      sections: [],
      exercises: [],
      quizzes: [],
      examples: [],
      resources: [],
    };
  }

  private getEmptyProgress(): ILearningProgress {
    return {
      currentSection: 0,
      totalSections: 0,
      completedExercises: 0,
      totalExercises: 0,
      completedQuizzes: 0,
      totalQuizzes: 0,
      score: 0,
      timeSpent: 0,
      mastery: {
        typescript: 0,
        nestjs: 0,
        testing: 0,
        code_quality: 0,
        security: 0,
        performance: 0,
        architecture: 0,
        best_practices: 0,
      },
    };
  }
}

// Дополнительные интерфейсы
export interface ICodeAnalysis {
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  issues: string[];
  suggestions: string[];
  score: number;
  feedback: string;
}

export interface ILearningPath {
  id: string;
  title: string;
  description: string;
  steps: ILearningStep[];
  estimatedTime: number;
  difficulty: LearningLevel;
}

export interface ILearningStep {
  id: string;
  title: string;
  description: string;
  topic: LearningTopic;
  level: LearningLevel;
  estimatedTime: number;
  prerequisites?: string[];
}
