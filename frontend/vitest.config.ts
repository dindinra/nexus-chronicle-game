import { defineConfig } from 'vitest/config'

// Minimal vitest config for logic-engine unit tests (no UI / no jsdom).
// Kept separate from vite.config.ts so the Vite dev/build setup is untouched.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
