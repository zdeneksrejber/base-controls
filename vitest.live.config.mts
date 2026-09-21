import { defineConfig } from 'vitest/config';
import { aliases } from './vitest.shared.mjs';

/** Runs only the tests that call real services. See `npm run test:live`. */
export default defineConfig({
    resolve: {
        alias: aliases
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./vitest.setup.ts'],
        include: ['src/**/*.live.test.ts'],
        restoreMocks: true
    }
});
