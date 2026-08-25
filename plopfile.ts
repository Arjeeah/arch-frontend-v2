import { generateModule } from './tools/plop/generators/module'
import type { NodePlopAPI } from 'plop'

export default function (plop: NodePlopAPI) {
  plop.setActionType('generateModule', generateModule)

  plop.setGenerator('module', {
    description: 'Create a new feature module',
    prompts: [{ type: 'input', name: 'name', message: 'Module name (kebab-case):' }],
    actions: [{ type: 'generateModule' }],
  })

  plop.setGenerator('component', {
    description: 'Create a shared component',
    prompts: [{ type: 'input', name: 'name', message: 'Component name (e.g. AppButton):' }],
    actions: [
      {
        type: 'add',
        path: 'src/shared/components/{{pascalCase name}}.vue',
        templateFile: 'tools/plop/templates/component/component.vue.hbs',
      },
    ],
  })
}
