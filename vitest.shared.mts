import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const src = (relativePath: string) => path.resolve(rootDir, 'src', relativePath);

/** The `tsconfig.json` path aliases, in the shape Vite's resolver wants. Shared by both test configs. */
export const aliases = [
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
];
