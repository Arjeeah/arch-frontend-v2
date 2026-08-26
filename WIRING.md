# WIRING — stream S3 (module `review`)

What the phase-3 integrator adds outside `src/modules/review/`. Nothing else in the
repo was touched by this stream.

## Routes

Add as a child of the `/` layout route in `src/app/router/index.ts`, alongside
`audit` (same role allowlist):

| path     | component (lazy import)                      | meta.roles                     |
| -------- | -------------------------------------------- | ------------------------------ |
| `review` | `@/modules/review/pages/ReviewQueuePage.vue` | `['super_admin', 'archivist']` |

```ts
{
  path: 'review',
  component: () => import('@/modules/review/pages/ReviewQueuePage.vue'),
  meta: { roles: ['super_admin', 'archivist'] },
},
```

Roles mirror `PipelinePolicy::viewStatus/update/verify`, which all require
`archivist` or `super_admin`. There is no detail route — the queue rail, the
document pane and the identity form are one screen by design (the operator works
through rows without navigating).

## Sidebar

One top-level item in `src/shared/components/AppSidebar.vue`.

| field      | value                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------ |
| `key`      | `review`                                                                                   |
| `labelKey` | `review.navLabel`                                                                          |
| `icon`     | `ClipboardCheck` (from `lucide-vue-next`)                                                  |
| `to`       | `/review`                                                                                  |
| `roles`    | `['super_admin', 'archivist']`                                                             |
| position   | top level, immediately **after** `borrowing` and **before** the `faculty-management` group |

```ts
{
  key: 'review',
  labelKey: 'review.navLabel',
  icon: ClipboardCheck,
  to: '/review',
  roles: ['super_admin', 'archivist'],
},
```

`labelKey` points into this module's own namespace rather than `nav.*`, so
merging `src/modules/review/i18n.fragment.json` is the only locale work needed —
no extra `nav.review` key to add by hand. If the sidebar is standardised on
`nav.*` later, the strings are **en** `Review Queue` / **ar** `قائمة المراجعة`.

If stream S2's pipeline items land in the same group, put `review` directly after
them — upload → monitor → review is the operator's actual order of work.

## i18n

Merge `src/modules/review/i18n.fragment.json` into `src/locales/en.json` and
`src/locales/ar.json`. Single top-level key per locale: `review`. 69 leaf keys in
each language, en/ar at exact parity, no collisions with existing namespaces.

Three entries are vue-i18n **plural** messages (`a | b | c`) — keep the pipes
intact through the merge: `review.actions.saveCorrections`,
`review.diff.correctedCount`, `review.toasts.saved`.

## Notes

1. **Backend gap — the two write endpoints are unreachable from the queue payload.**
   `PATCH /v1/refinements/{refinement}` and `POST /v1/refinements/{refinement}/verify`
   bind by `document_refinements.id`, but `ReviewQueueResource` only sends
   `document_id` (`student_documents.id`) — the refinement's own id is not exposed
   by any endpoint in the API. The list, the document pane, the form, the diff and
   the keyboard flow all work; **Verify and Save will 404 until the backend closes
   this**, either by adding `'refinement_id' => $refinement?->id` to
   `ReviewQueueResource::toArray()` or by rebinding the two routes to the student
   document. `reviewApi.fromResource` already reads an optional `refinement_id` and
   falls back to `document_id`, so the screen starts working on the first option
   with no frontend change. This is a backend ticket, not integrator work — flag it
   to whoever owns `arch-backend`.

2. **`file_url` must be publicly readable.** The document pane renders the Spatie
   media URL in an `<img>`/`<iframe>`, neither of which can attach the bearer
   token. If media is moved behind a signed or authenticated route the pane goes
   blank and the module needs a blob-fetch path instead.

3. **Three pre-existing `shared/` gaps this screen runs into.** All outside this
   stream's territory, none blocking; listed so whoever owns `shared/` sees them,
   since every module inherits them:
   - `AppConfirmDialog` hardcodes an English **"Cancel"** on its cancel button, so
     the discard dialog reads half-Arabic in the `ar` locale.
   - `AppSelect` accepts no `disabled` and forwards no `id`/`aria-label` to its
     native `<select>` (stray attrs land on the wrapper `div`). Consequence here:
     the college and document-type selects stay editable while a save is in
     flight, and their `FormField` label has nothing to point `for` at.
   - `AppSelect`'s chevron is positioned with a physical `right-3`, so it sits on
     the wrong side under `dir="rtl"`.
