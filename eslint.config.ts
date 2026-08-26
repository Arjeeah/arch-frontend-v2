import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginOxlint from 'eslint-plugin-oxlint'
import skipFormatting from 'eslint-config-prettier/flat'
import boundaries from 'eslint-plugin-boundaries'

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{vue,ts,mts,tsx}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

  ...pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,

  ...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),

  skipFormatting,

  {
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        {
          type: 'module',
          pattern: 'src/modules/*',
          capture: ['moduleName'],
        },
        {
          type: 'shared',
          pattern: 'src/shared/**',
        },
        {
          type: 'app',
          pattern: 'src/app/**',
        },
        // Dev-only pages (the component gallery). Declared so the boundary
        // rule actually applies — an undeclared directory is exempt from
        // `boundaries/dependencies` entirely.
        {
          type: 'dev-page',
          pattern: 'src/pages/**',
        },
      ],
      'boundaries/ignore': ['**/*.test.ts', '**/*.spec.ts'],
      // Required for boundaries plugin to resolve @-aliased imports (defined in tsconfig.app.json)
      'import/resolver': {
        typescript: {
          project: './tsconfig.app.json',
        },
      },
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          rules: [
            // modules can import shared and app/config (e.g. env.ts for apiBaseUrl)
            {
              from: { type: 'module' },
              allow: [
                { to: { type: 'shared' } },
                { to: { type: 'app' } },
                // same module self-reference
                { to: { type: 'module', captured: { moduleName: '{{from.moduleName}}' } } },
              ],
            },
            // shared can only import shared
            {
              from: { type: 'shared' },
              allow: { to: { type: 'shared' } },
            },
            // dev-only pages exist to demo shared components, so that is all
            // they may reach for — never a feature module's internals
            {
              from: { type: 'dev-page' },
              allow: { to: { type: 'shared' } },
            },
            // app can import shared, app, and module pages (router wires up all
            // modules) — plus the dev pages, which the router registers behind
            // an `import.meta.env.DEV` guard
            {
              from: { type: 'app' },
              allow: [
                { to: { type: 'shared' } },
                { to: { type: 'app' } },
                { to: { type: 'module' } },
                { to: { type: 'dev-page' } },
              ],
            },
          ],
        },
      ],
    },
  },
)
