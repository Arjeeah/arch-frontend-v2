# User Management Design

**Goal:** Build the Super Admin User Management feature — list page, view user page, and create/edit dialog — using mock data.

**Architecture:** New `src/modules/users/` module. Mock data in `data/mockUsers.ts`. Two pages compose focused child components. `CreateUserDialog` reuses the existing `AppDialog` component for both create and edit flows.

**Tech Stack:** Vue 3 (Composition API), Tailwind CSS, Lucide Vue Next, existing `AppDialog` + `FormInput` shared components. Mock data only — no API calls.

---

## Module Structure

```
src/modules/users/
  pages/
    UserListPage.vue          ← list + search + filters + pagination
    UserDetailPage.vue        ← view user profile
  components/
    UserTable.vue             ← table rows
    UserStatusBadge.vue       ← Active (green) / Inactive (gray) pill
    UserPermissionsCard.vue   ← 2-col permission grid (green/yellow/gray)
    UserActivityCard.vue      ← recent 5 activities table
    CreateUserDialog.vue      ← AppDialog-based create/edit form
  data/
    mockUsers.ts              ← all mock data in one place
  types/
    index.ts                  ← User, Permission, Activity interfaces
```

---

## Mock Data (`mockUsers.ts`)

20 mock users covering all roles and statuses. Fields per user:
- `id`, `name`, `email`, `role`, `faculty`, `status`, `lastLogin`, `createdAt`
- `permissions`: array of `{ label, state: 'allowed' | 'warning' | 'denied' }`
- `recentActivity`: array of `{ timestamp, action, details }` (up to 5)

Static lists also exported:
- `mockRoles` — ['Super admin', 'Admin', 'Archivist', 'Faculty staff']
- `mockFaculties` — ['IT', 'Business', 'Architecture', 'Medicine', 'Law', 'Engineering']

---

## Page 1: UserListPage (`/users`)

**Header:** "User Management" title + "Manage system users and their roles" subtitle + "Add User" button (top right, opens `CreateUserDialog` in create mode)

**Filters:**
- Search input (with search icon, filters by name/email client-side)
- All Roles dropdown
- All Status dropdown (Active / Inactive)
- All Faculties dropdown (populated from mockFaculties)
- All filters are client-side (filter the mock array)

**Table** via `UserTable`:
- Columns: Name (clickable → `/users/:id`) | Email | Role | Faculty | Status (`UserStatusBadge`) | Last Login | Created At | Actions
- Actions: blue pencil icon (opens `CreateUserDialog` pre-filled) + red ban icon (removes from local list with `AppDialog` confirm)

**Pagination:**
- 10 users per page, client-side slice
- `← 1 2 3 4 5 … N →` controls

**States:** loading skeleton (fake 300ms delay on mount), empty state if no results match filters

---

## Page 2: UserDetailPage (`/users/:id`)

**Profile header** — dark navy card: initials avatar (first letters of name), full name, status badge, email

**4 info blocks:** Role | Faculties (bullet list, can be multiple) | Last Login | Created At

**Left panel — `UserPermissionsCard`:**
- 2-column grid, 3 visual states:
  - Green checkbox = Allowed
  - Yellow warning icon = With warning
  - Gray X = Denied
- Legend: "Allowed · With warning · Denied"

**Right panel — `UserActivityCard`:**
- Table: Timestamp | Action (colored, dot.notation e.g. `file.view`) | Details
- Max 5 rows

**Bottom:** "Back" button (→ `/users`) + "Edit User" button (opens `CreateUserDialog` pre-filled)

---

## CreateUserDialog

Wraps existing `AppDialog`. Props: `open: boolean`, `user?: User` (undefined = create mode, provided = edit mode)

**Fields:**
- Full Name — text input
- Email — text input
- Role + Faculty — two dropdowns (side by side, 50/50)
- Default Password — password input with eye toggle (hidden/optional in edit mode)
- Status — toggle switch with label "set user account as active or inactive"

**Buttons:** Cancel + Save User (create) / Update User (edit)

**On submit:** in create mode adds to local mock list; in edit mode updates in local list. No API calls.

**Validation:** name, email, role required. Password required in create mode only.

---

## Routing

Add to `src/app/router/index.ts` under the `/` layout children:
```ts
{ path: 'users', component: () => import('@/modules/users/pages/UserListPage.vue') },
{ path: 'users/:id', component: () => import('@/modules/users/pages/UserDetailPage.vue') },
```

The sidebar already links to `/users` via the "User Management" nav item.
