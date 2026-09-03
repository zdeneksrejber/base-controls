import path from 'path';
import { defineConfig } from 'vitest/config';

const src = (relativePath: string) => path.resolve(import.meta.dirname, 'src', relativePath);

export default defineConfig({
    resolve: {
        alias: [
            { find: /^@components$/, replacement: src('components/index.ts') },
            { find: /^@components\/(.*)$/, replacement: src('components/$1') },
            { find: /^@hooks$/, replacement: src('hooks/index.ts') },
            { find: /^@hooks\/(.*)$/, replacement: src('hooks/$1') },
            { find: /^@interfaces$/, replacement: src('interfaces/index.ts') },
            { find: /^@interfaces\/(.*)$/, replacement: src('interfaces/$1') },
            { find: /^@legacy$/, replacement: src('legacy/react-components/index.ts') },
            { find: /^@legacy\/(.*)$/, replacement: src('legacy/react-components/$1') },
            { find: /^@utils$/, replacement: src('utils/index.ts') },
            { find: /^@utils\/(.*)$/, replacement: src('utils/$1') },
            { find: /^@\/(.*)$/, replacement: src('$1') }
        ]
    },
    test: {
        environment: 'jsdom',
        setupFiles: ['./vitest.setup.ts'],
        //the storybook's own helpers are part of the repo and get the same gate as the control's
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'storybook/src/**/*.test.ts'],
        //the live suite spends api quota, so it needs asking for by name
        exclude: ['**/node_modules/**', 'src/**/*.live.test.ts'],
        restoreMocks: true
    }
});
