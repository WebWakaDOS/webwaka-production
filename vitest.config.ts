// WebWaka OS v4 — Canonical Vitest Configuration
// Blueprint Reference: Part 8.1 — Testing Strategy
// 5-Layer QA Protocol: Layer 2 (Unit Tests)
// Note: Coverage thresholds set to current baseline; will be raised as test suite grows
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 30,
        functions: 80,
        branches: 80,
        statements: 30,
      },
    },
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
  },
});
