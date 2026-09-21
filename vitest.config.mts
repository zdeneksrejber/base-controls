import { defineConfig } from 'vitest/config';
import { aliases } from './vitest.shared.mjs';

export default defineConfig({
    resolve: {
        alias: aliases
    },
    test: {
        environment: 'jsdom',
        //matches the `vitest/globals` entry in tsconfig.test.json - drop both together to go explicit
        globals: true,
        setupFiles: ['./vitest.setup.ts'],
        //only src is behind the tsc gate in `npm test`; storybook-side tests need their own tsconfig first
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
        //the live suite spends api quota, so it needs asking for by name
        exclude: ['**/node_modules/**', 'src/**/*.live.test.ts'],
        restoreMocks: true,
        server: {
            deps: {
                //ESM packages importing `react/jsx-runtime` bare: React 17 has no exports map, so Node's own
                //resolver rejects the extensionless subpath - Vite's does not, so these go through Vite
                inline: [/@griffel\//, /@fluentui\//]
            }
        }
    }
});
