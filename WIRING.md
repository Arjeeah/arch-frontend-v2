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
   `AppSelect.vue` and `AppPagination.vue` likewise use `pl-`/`pr-`/`right-3` internally, and
   `AppConfirmDialog.vue` hard-codes an English `Cancel`.

   **Worked around for the loading string only:** `PipelineDocumentsTable.vue` renders its own
   translated skeleton rows in the `#rows` slot instead of passing `:loading` to `DataTable`, so the
   untranslatable `Loading…` never reaches this screen — it was the string an operator sees most
   often here. The `<th>` alignment issue still stands and still needs the shared pass.

4. **Response-shape deviation from the phase-2 spec.** `POST /v1/bulk-import` returns
   `{ documents_queued, document_ids }` — the key is `documents_queued`, not `count`
   (`BulkImportController::store`, `BulkImportResponseResource`). The mapper reads the real key.

5. **All ids are UUID strings**, not integers — `StudentDocument`, `Student` and `DocumentType` all
   use `HasUuids`. Typed as `string` throughout this module; any route param or lookup added later
   should do the same.

6. **`confidence_score` is 0–100 and arrives as a string.** `RefinementData::fromArray()`
   multiplies the model's 0.0–1.0 answer by 100 before storage (which is why
   `config('ai.pipeline.confidence_threshold')` is `85`, not `0.85`), and the column is
   `decimal(5,2)` behind Laravel's `decimal:2` cast, so the wire value is `"92.00"`. The api
   mapper coerces it (`toConfidence`) and `formatConfidence` divides by 100. Anything that
   changes that scale server-side has to change both.

7. **Deployment: PHP's own upload limits cap a bulk import long before Laravel's `max:500` does.**
   `max_file_uploads` defaults to **20**, and files past it are discarded by PHP before the
   request reaches validation — so a 500-file batch returns an ordinary `202` reporting 20
   queued. The UI now compares `documents_queued` against the number of files it sent and shows
   a sticky warning when they differ, but the real fix is server config: raise
   `max_file_uploads`, `post_max_size` and `upload_max_filesize` (500 × 20 MB is 10 GB, so the
   practical batch size is far smaller than the validation rule suggests) or have the operator
   import in smaller batches.

8. **Verify against a live API once the backend is up:**
   - `GET /v1/pipeline/status` is assumed to be `{ data: { "<status>": <count> } }` (a bare
     `pluck()` through `ApiResponse::success`). States with no rows are absent and are filled in
     as `0` by `countsFromResource`. An archive with no documents at all serialises the empty
     collection as `[]`; `countsFromResource` handles that too.
   - `DocumentPipelineStatusResource.has_embeddings` is filled with `->count()` despite the
     boolean-sounding name; mapped to `embeddedPageCount: number`.
   - `.tif` files: `BULK_IMPORT_ACCEPT` matches on `image/tiff` as well as `.tiff`, on the
     assumption that Laravel's `mimes:tiff` accepts the extension it guesses from the MIME type.
     If the backend rejects `.tif` in practice, drop `image/tiff` from that constant.

9. **Known debt, deliberately not fixed here:**
   - **No plural agreement in either locale.** Strings like `pipeline.upload.selectionSummary`
     read "1 files selected". Correct handling needs vue-i18n plural messages plus a custom
     Arabic pluralization rule registered on the i18n instance — `src/app/plugins/i18n.ts`,
     outside this stream's territory. Worth a shared pass once one locale file owns it.
   - **`ocr_completed` is excluded from the auto-poll's in-flight set** (`status.ts`). It is a
     transient state in a healthy run but also the state the backend calls retryable, i.e.
     stuck. Excluding it means the poll settles instead of running forever against a stuck
     archive; the cost is that a document parked there needs a manual Refresh to update.
