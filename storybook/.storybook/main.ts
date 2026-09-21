import type { StorybookConfig } from '@storybook/react-vite';
import path from 'path';
import { fileURLToPath } from 'url';

const storybookDir = path.dirname(fileURLToPath(import.meta.url));
const githubPagesBasePath = '/base-controls/';
const isLocalDevelopment = process.env.NODE_ENV !== 'production';

const stories: NonNullable<StorybookConfig['stories']> = ['../src/**/*.stories.@(ts|tsx)', '../src/**/*.mdx'];

if (!isLocalDevelopment) {
  stories.splice(0, stories.length, '../src/**/!(*Scratch|*Dev*).stories.@(ts|tsx)', '../src/**/*.mdx');
}

const config: StorybookConfig = {
  stories,
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
    defaultName: 'Overview',
  },
  typescript: {
    reactDocgen: false,
  },
  async viteFinal(config) {
    config.base = process.env.STORYBOOK_BASE_PATH ?? githubPagesBasePath;
    config.resolve ??= {};
    config.resolve.alias = [
      ...(Array.isArray(config.resolve.alias) ? config.resolve.alias : []),
      {
        find: /^@talxis\/base-controls$/,
        replacement: path.resolve(storybookDir, '../../src/index.ts'),
      },
      {
        find: /^@talxis\/base-controls\/(.*)$/,
        replacement: path.resolve(storybookDir, '../../src/$1'),
      },
      {
        find: /^@components$/,
        replacement: path.resolve(storybookDir, '../../src/components/index.ts'),
      },
      {
        find: /^@components\/(.*)$/,
        replacement: path.resolve(storybookDir, '../../src/components/$1'),
      },
      {
        find: /^@hooks$/,
        replacement: path.resolve(storybookDir, '../../src/hooks/index.ts'),
      },
      {
        find: /^@hooks\/(.*)$/,
        replacement: path.resolve(storybookDir, '../../src/hooks/$1'),
      },
      {
        find: /^@interfaces$/,
        replacement: path.resolve(storybookDir, '../../src/interfaces/index.ts'),
      },
      {
        find: /^@interfaces\/(.*)$/,
        replacement: path.resolve(storybookDir, '../../src/interfaces/$1'),
      },
      {
        find: /^@legacy$/,
        replacement: path.resolve(storybookDir, '../../src/legacy/react-components/index.ts'),
      },
      {
        find: /^@legacy\/(.*)$/,
        replacement: path.resolve(storybookDir, '../../src/legacy/react-components/$1'),
      },
      {
        find: /^@utils$/,
        replacement: path.resolve(storybookDir, '../../src/utils/index.ts'),
      },
      {
        find: /^@utils\/(.*)$/,
        replacement: path.resolve(storybookDir, '../../src/utils/$1'),
      },
      {
        find: /^@\/(.*)$/,
        replacement: path.resolve(storybookDir, '../../src/$1'),
      },
      {
        find: /^react$/,
        replacement: path.resolve(storybookDir, '../node_modules/react'),
      },
      {
        find: /^react-dom$/,
        replacement: path.resolve(storybookDir, '../node_modules/react-dom'),
      },
      {
        find: '@storybook/react-dom-shim',
        replacement: path.resolve(storybookDir, './react-dom-shim.ts'),
      },
    ];

    config.server ??= {};
    config.server.fs ??= {};
    config.server.fs.allow = [
      ...(config.server.fs.allow ?? []),
      path.resolve(storybookDir, '../..'),
    ];
    // prevents infinite or excessive watch recursion without breaking local source resolution.
    config.server.watch ??= {};
    config.server.watch.followSymlinks = false;
    // Nothing extra to ignore: Vite already defaults to **/.git/**, **/node_modules/**, **/test-results/**
    // and the cache dir, and server.fs.allow only widens what the server will serve - out-of-root files are
    // watched one at a time as they enter the module graph, never as whole trees.
    // A machine whose fs.inotify.max_user_watches is low can still lose the dev server to ENOSPC on startup.
    // Raising that limit is the real fix; STORYBOOK_POLL_WATCHER=1 trades CPU for needing no inotify watches.
    if (process.env.STORYBOOK_POLL_WATCHER === '1') {
      config.server.watch.usePolling = true;
      config.server.watch.interval = 1000;
      config.server.watch.binaryInterval = 2000;
    }
    return config;
  },
};

export default config;
