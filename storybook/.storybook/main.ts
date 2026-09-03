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

    //the Code panel on the map pages looks a demo hook up in its own module by name, which the minifier
    //would otherwise have shortened to a single letter
    config.esbuild = { ...(config.esbuild || {}), keepNames: true };

    //adaptivecards and adaptivecards-templating are CommonJS, so they need pre-bundling to import by name.
    //adaptive-expressions, which the templating engine parses with, does not survive it - see the note on
    //expandAdaptiveCardTemplate for what the control does about that.
    config.optimizeDeps ??= {};
    config.optimizeDeps.include = [
      ...(config.optimizeDeps.include ?? []),
      'adaptivecards',
      'adaptivecards-templating'
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
    // server.fs.allow opens the parent up, so without this Vite watches the repo's node_modules and dist as
    // well - tens of thousands of files, enough to exhaust the OS inotify instance limit and kill the server
    config.server.watch.ignored = [
      ...(Array.isArray(config.server.watch.ignored) ? config.server.watch.ignored : []),
      '**/node_modules/**',
      '**/dist/**',
      '**/storybook-static/**',
      '**/.git/**',
      '**/.yalc/**',
    ];
    // Watching this many source directories needs one inotify instance each, and a machine whose
    // fs.inotify.max_user_instances is low enough will kill the dev server with ENOSPC on startup. Raising
    // that limit is the real fix; STORYBOOK_POLL_WATCHER=1 trades some CPU for needing none of them.
    if (process.env.STORYBOOK_POLL_WATCHER === '1') {
      config.server.watch.usePolling = true;
      config.server.watch.interval = 1000;
      config.server.watch.binaryInterval = 2000;
    }
    return config;
  },
};

export default config;
