# WIRING — S2 · Bulk import & pipeline monitor (`src/modules/pipeline/`)

Everything below is outside this stream's territory and has to be applied by the integrator.

## Routes

Add as children of the `/` layout route in `src/app/router/index.ts`.

| path               | lazy component import                                              | meta.roles                     |
| ------------------ | ------------------------------------------------------------------ | ------------------------------ |
| `pipeline/import`  | `() => import('@/modules/pipeline/pages/BulkImportPage.vue')`      | `['super_admin', 'archivist']` |
| `pipeline/monitor` | `() => import('@/modules/pipeline/pages/PipelineMonitorPage.vue')` | `['super_admin', 'archivist']` |

```ts
{
  path: 'pipeline/import',
  component: () => import('@/modules/pipeline/pages/BulkImportPage.vue'),
  meta: { roles: ['super_admin', 'archivist'] },
},
{
  path: 'pipeline/monitor',
  component: () => import('@/modules/pipeline/pages/PipelineMonitorPage.vue'),
  meta: { roles: ['super_admin', 'archivist'] },
},
```

Roles come from `App\Policies\PipelinePolicy` — `bulkImport`, `viewStatus` and `retry` all require
`archivist` or `super_admin`. `faculty_staff` must not see either screen.

**The two paths are hard-coded in the pages** (`MONITOR_PATH` in `BulkImportPage.vue`,
`UPLOAD_PATH` in `PipelineMonitorPage.vue`) because the pages link to each other. If you route them
anywhere other than `/pipeline/import` and `/pipeline/monitor`, update those two constants to match.

## Sidebar

One collapsible parent with two children, using the `children` shape `AppSidebar` already supports
(the `faculty-management` entry is the model). Place it **after** the search item (S1) and before
the students group (S4) — import is where an archivist's day starts.

| field    | value                                                         |
| -------- | ------------------------------------------------------------- |
| key      | `pipeline`                                                    |
| labelKey | `pipeline.nav.group`                                          |
| icon     | `Workflow` (lucide-vue-next; present in the installed v1.0.0) |
| roles    | `['super_admin', 'archivist']`                                |
| position | top level, after S1's search item, before S4's students item  |

Children:

| labelKey               | to                  | roles                          |
| ---------------------- | ------------------- | ------------------------------ |
| `pipeline.nav.import`  | `/pipeline/import`  | `['super_admin', 'archivist']` |
| `pipeline.nav.monitor` | `/pipeline/monitor` | `['super_admin', 'archivist']` |

```ts
{
  key: 'pipeline',
  labelKey: 'pipeline.nav.group',
  icon: Workflow,
  roles: ['super_admin', 'archivist'],
  children: [
    { labelKey: 'pipeline.nav.import', to: '/pipeline/import', roles: ['super_admin', 'archivist'] },
    { labelKey: 'pipeline.nav.monitor', to: '/pipeline/monitor', roles: ['super_admin', 'archivist'] },
  ],
},
```

## i18n

`src/modules/pipeline/i18n.fragment.json` → merge `en.pipeline` into `src/locales/en.json` and
`ar.pipeline` into `src/locales/ar.json`. It is a single top-level `pipeline` key with no collisions
against the existing locale files, and it carries its own nav labels — **no `nav.*` keys are needed
for this stream**.

The eight `pipeline.status.*` Arabic values are copied verbatim from
`App\Enums\Pipeline\PipelineStatus::label()`. If that enum's wording changes, change these to match
(the UI also renders the live API label in each row's expanded detail, so drift is visible at runtime).

## Notes

1. **No shared-kit, router, locale or `src/app/` files were modified.** `src/app/config/api.ts` was
   deliberately left alone — the pipeline endpoints live in `src/modules/pipeline/api/pipelineApi.ts`
   next to their mappers. Move them into `API_ENDPOINTS` later if the project standardises on that.

2. **Backend gap — `/v1/student-documents` cannot filter or sort by pipeline state.**
   `StudentDocumentResource` does not expose `pipeline_status`, and
   `StudentDocumentController::index` only allows the filters `file_number`, `student_id`,
   `document_type_id` and `file_status`. The monitor therefore fetches
   `GET /v1/pipeline/status/{id}` once per visible row (15 per page, `Promise.allSettled`, failures
   dropped) and its pipeline-state filter narrows the loaded page only — the UI says so in
   `pipeline.monitor.pageFilterHint`. **The clean fix is server-side:** add `pipeline_status` to
   `StudentDocumentResource` and to `allowedFilters`/`allowedSorts`. When that lands, delete the
   hydration pass in `PipelineMonitorPage.vue` and filter through `setFilters` instead. Marked in
   the code with `// verify against live API` on `pipelineApi.listDocuments`.

3. **Shared-kit follow-up (not fixed here — `src/shared/` is out of territory):**
   `DataTable.vue` emits physical `text-left` / `text-center` / `text-right` on its `<th>`s and a
   hard-coded English `Loading…` / `No data`. In RTL the headers align opposite to the cells, which
   use logical `text-start`. Worth switching to `text-start`/`text-end` and `t()` in a shared pass.
   `AppSelect.vue` and `AppPagination.vue` likewise use `pl-`/`pr-`/`right-3` internally.

4. **Response-shape deviation from the phase-2 spec.** `POST /v1/bulk-import` returns
   `{ documents_queued, document_ids }` — the key is `documents_queued`, not `count`
   (`BulkImportController::store`, `BulkImportResponseResource`). The mapper reads the real key.

5. **All ids are UUID strings**, not integers — `StudentDocument`, `Student` and `DocumentType` all
   use `HasUuids`. Typed as `string` throughout this module; any route param or lookup added later
   should do the same.

6. **Verify against a live API once the backend is up:**
   - `GET /v1/pipeline/status` is assumed to be `{ data: { "<status>": <count> } }` (a bare
     `pluck()` through `ApiResponse::success`). States with no rows are absent and are filled in
     as `0` by `countsFromResource`.
   - `DocumentPipelineStatusResource.has_embeddings` is filled with `->count()` despite the
     boolean-sounding name; mapped to `embeddedPageCount: number`.
   - `.tif` files: `BULK_IMPORT_ACCEPT` matches on `image/tiff` as well as `.tiff`, on the
     assumption that Laravel's `mimes:tiff` accepts the extension it guesses from the MIME type.
     If the backend rejects `.tif` in practice, drop `image/tiff` from that constant.
