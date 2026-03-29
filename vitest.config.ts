// WebWaka OS v4 — Canonical Vitest Configuration
// Blueprint Reference: Part 8.1 — Testing Strategy
// 5-Layer QA Protocol: Layer 2 (Unit Tests) — >90% coverage target
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
  },
});
