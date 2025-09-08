// import { vi } from "vitest"; // Не используется
describe('Example Test', () => {
  it('should pass', () => {
    expect(true).toBe(true);
  });

  it('should handle basic math', () => {
    expect(2 + 2).toBe(4);
  });

  it('should handle string operations', () => {
    const str = 'Hello World';
    expect(str).toContain('Hello');
    expect(str.length).toBe(11);
  });
});
