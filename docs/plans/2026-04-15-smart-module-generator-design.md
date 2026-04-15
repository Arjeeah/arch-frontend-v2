# Smart Module Generator Design

**Goal:** Upgrade `npm run gen:module` so it collects field definitions interactively and generates every file fully filled-in — types, table columns, dialog inputs, search, and filter dropdowns — with zero `// TODO` placeholders.

**Approach:** Replace the module's Handlebars templates with a custom TypeScript action in `plopfile.ts`. Plop collects a field schema via interactive prompts, then a set of `buildX()` helper functions generate each file as a plain string.

---

## CLI Prompt Flow

```
? Module name (kebab-case): borrowing

? Field name (camelCase, or leave blank to finish): bookTitle
? Field type: text

? Field name (camelCase, or leave blank to finish): status
? Field type: select
? Options (comma-separated): Active, Inactive, Overdue
? Show as filter dropdown? Yes

? Field name (camelCase, or leave blank to finish): dueDate
? Field type: date

? Field name (camelCase, or leave blank to finish): [blank → done]

✔  7 files created
```

Rules:

- Every field appears in types, table, and dialog
- Only `select` fields marked filterable get a filter dropdown
- All `text` fields are included in the search computed
- Leaving field name blank ends the loop

---

## Field Types → Generated Output

### types.ts

| Field type | TypeScript type           |
| ---------- | ------------------------- |
| text       | `string`                  |
| number     | `number`                  |
| date       | `string`                  |
| select     | `'Opt1' \| 'Opt2' \| ...` |

### Table columns

- `text` / `number` / `date` → plain text span with `truncate`
- `select` → coloured inline badge (green=first option, others grey)

### Dialog inputs

| Field type | Input                          |
| ---------- | ------------------------------ |
| text       | `FormInput`                    |
| number     | `FormInput type="number"`      |
| date       | `FormInput type="date"`        |
| select     | `AppSelect` with options array |

All fields required — `errors` object + `validate()` generated for every field.

### List page

- One search `<input>` that filters across all `text` fields
- One `AppSelect` filter per filterable `select` field
- `usePagination` + `AppPagination` wired in
- Both dialogs (create/edit + delete confirm) connected

---

## Architecture

### Files changed

- `plopfile.ts` — field prompts + `customAction`
- `tools/plop/generators/module.ts` — new file, all `buildX()` functions
- `tools/plop/templates/module/*.hbs` — deleted (replaced by module.ts)
- `tools/plop/templates/component/component.vue.hbs` — kept unchanged

### Why no Handlebars

Handlebars cannot loop over a runtime-collected array of fields or branch per field type. A plain TypeScript function handles both trivially.

### Field schema shape (internal)

```ts
interface Field {
  name: string // camelCase, e.g. "bookTitle"
  type: 'text' | 'number' | 'date' | 'select'
  options?: string[] // only for select
  filterable?: boolean // only for select
}
```

### Builder functions in module.ts

- `buildTypes(name, fields)` → `types.ts` content
- `buildApi(name)` → `api.ts` content
- `buildStore(name)` → `store.ts` content
- `buildIndex(name)` → `index.ts` content
- `buildTable(name, fields)` → `<Name>Table.vue` content
- `buildDialog(name, fields)` → `Create<Name>Dialog.vue` content
- `buildPage(name, fields)` → `<Name>ListPage.vue` content

The custom action calls all builders, writes files via `fs.writeFileSync`, and returns a summary string.
