import type { NodePlopAPI } from 'plop'

export default function (plop: NodePlopAPI) {
  plop.setGenerator('module', {
    description: 'Create a new feature module',
    prompts: [{ type: 'input', name: 'name', message: 'Module name (kebab-case):' }],
    actions: [
      {
        type: 'add',
        path: 'src/modules/{{kebabCase name}}/index.ts',
        templateFile: 'tools/plop/templates/module/index.ts.hbs',
      },
      {
        type: 'add',
        path: 'src/modules/{{kebabCase name}}/types.ts',
        templateFile: 'tools/plop/templates/module/types.ts.hbs',
      },
      {
        type: 'add',
        path: 'src/modules/{{kebabCase name}}/pages/{{pascalCase name}}Page.vue',
        templateFile: 'tools/plop/templates/module/page.vue.hbs',
      },
      {
        type: 'add',
        path: 'src/modules/{{kebabCase name}}/stores/use{{pascalCase name}}Store.ts',
        templateFile: 'tools/plop/templates/module/store.ts.hbs',
      },
      {
        type: 'add',
        path: 'src/modules/{{kebabCase name}}/api/{{camelCase name}}Api.ts',
        templateFile: 'tools/plop/templates/module/api.ts.hbs',
      },
    ],
  })

  plop.setGenerator('component', {
    description: 'Create a shared component',
    prompts: [{ type: 'input', name: 'name', message: 'Component name (PascalCase):' }],
    actions: [
      {
        type: 'add',
        path: 'src/shared/components/{{pascalCase name}}.vue',
        templateFile: 'tools/plop/templates/component/component.vue.hbs',
      },
    ],
  })

  plop.setGenerator('page', {
    description: 'Create a page inside an existing module',
    prompts: [
      { type: 'input', name: 'module', message: 'Module (kebab-case):' },
      { type: 'input', name: 'name', message: 'Page name (kebab-case):' },
    ],
    actions: [
      {
        type: 'add',
        path: 'src/modules/{{kebabCase module}}/pages/{{pascalCase name}}Page.vue',
        templateFile: 'tools/plop/templates/module/page.vue.hbs',
      },
    ],
  })

  plop.setGenerator('store', {
    description: 'Create a pinia store inside an existing module',
    prompts: [
      { type: 'input', name: 'module', message: 'Module (kebab-case):' },
      { type: 'input', name: 'name', message: 'Store name (kebab-case):' },
    ],
    actions: [
      {
        type: 'add',
        path: 'src/modules/{{kebabCase module}}/stores/use{{pascalCase name}}Store.ts',
        templateFile: 'tools/plop/templates/module/store.ts.hbs',
      },
    ],
  })
}
