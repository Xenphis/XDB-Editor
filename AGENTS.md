# ISC Editor — Agent Guidelines

## Project Overview

ISC Editor is a desktop application built with **Tauri** (Rust backend) + **Vue 3** (TypeScript frontend) for editing World of Warcraft emulator server databases (AzerothCore / TrinityCore). It allows server administrators to manage NPCs, game objects, items, quests, maps, loot, and spells through a GUI that generates and applies SQL queries.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3 + TypeScript, Vite, PrimeVue 4 (TrinityPreset / cyan theme) |
| State | Pinia 3 |
| Routing | vue-router 4 (hash history, auth guard via `connectionStore.isConnected`) |
| i18n | vue-i18n 11 — locales: `en`, `fr` (files under `src/i18n/locales/`) |
| SQL generation | `squel-ts` + `useQueryGenerator` composable |
| Backend | Tauri 2 (Rust) — communicates with a MySQL database |
| Package manager | **pnpm** |

## Build & Run

```bash
# Full Tauri dev app (required for DB features)
pnpm tauri dev

# Production build
pnpm build          # vue-tsc + vite build
pnpm tauri build    # Tauri production bundle
```

## Architecture

### Frontend → Backend communication

All database operations go through `src-tauri/src/commands/`. The frontend calls them exclusively via `invoke()` from `@tauri-apps/api/core`:

```ts
import { invoke } from '@tauri-apps/api/core'
invoke('command_name', { param1, param2 })
```

Never use `fetch` or direct database connections from the frontend.

### Module structure

Each feature module lives in `src/modules/<module_name>/` and follows this layout:

```
<module>/
  service.ts      # All invoke() calls for this module
  store.ts        # Pinia store — reactive state + diff/SQL generation
  types/          # TypeScript interfaces mirroring DB table shapes
  pages/          # Vue route components (list page + editor page)
  i18n/           # Module-specific translation keys (merged into global i18n)
  stores/         # Optional additional Pinia stores for sub-tables
```

### SQL diff pattern

Editors do not run SQL directly. They accumulate changes in Pinia stores and generate diff queries through `createEntityEditorStore` and `useQueryGenerator`. Repeated child rows use `SubTableManager`. Queries are staged in `sessionChanges` store only for modules that explicitly opt into session aggregation, and can be reviewed in the `SqlQueryPanel` before being applied.

### Routing conventions

- All authenticated routes are children of the `AppLayout` component.
- Each module owns its internal routes in `src/modules/<module>/routes.ts`.
- `src/router/index.ts` only mounts `sqlSessionRoute` and `moduleRoutes` from `src/modules/registry.ts`.
- Route paths usually follow the pattern `/<module>`, `/<module>/new`, `/<module>/:id`; nested tables may use `/<module>/<table>`, `/<module>/<table>/new`, `/<module>/<table>/:id`.
- Auth guard in `src/router/index.ts` redirects unauthenticated users to `/login`.

## Implementing a New Table

Use this workflow when adding support for a database table. Prefer extending an existing feature module when the table belongs to an existing domain; create a new module only for a new top-level navigation area.

### 1. Define table ownership

- Existing domain table: add it under `src/modules/<module>/` and, if needed, under a focused subfolder such as `pages/editor/<table>/` or `stores/<table>Store.ts`.
- New top-level module: create `src/modules/<module>/` with `service.ts`, `store.ts`, `routes.ts`, `types/`, `pages/`, and `i18n/`.
- Keep DB table names and DB column names exact in TypeScript types. Do not rename DB columns to frontend-friendly names.

### 2. Add backend commands

- Add one Rust command file per DB table in `src-tauri/src/commands/`.
- Define Rust structs matching the DB columns and derive `Serialize`, `Deserialize`, and `FromRow` as needed.
- Use `debug_sql!` for every SQL query so it appears in `SqlDebugViewer`.
- Register the command module in `src-tauri/src/commands/mod.rs` and register every command in `src-tauri/src/lib.rs` `invoke_handler!`.
- Use `SELECT` for list/detail reads, `REPLACE INTO` or explicit `INSERT/UPDATE` for saves following the table's existing backend style, and targeted `DELETE` for deletes.
- Composite-key tables must bind every key column in read/delete queries.

### 3. Add frontend types and service

- Add table types under `src/modules/<module>/types/`.
- Add all frontend backend calls in the module `service.ts` with `invoke()` from `@tauri-apps/api/core`.
- Never call Tauri commands directly from Vue pages; pages use the Pinia store, and stores/services call `invoke()`.

### 4. Create or extend the Pinia store

Use `createEntityEditorStore<T>` for table editors whenever the table is edited as one main row plus optional child rows.

For a simple primary key:

```ts
const editor = createEntityEditorStore<MyRow>({
  tableName: 'my_table',
  primaryKey: 'entry',
  createDefault,
  load: service.getRow,
  save: service.saveRow,
  delete: service.deleteRow,
})
```

For a composite key, use the factory key configuration rather than pretending one column is unique:

```ts
type MyRowKey = `${number}:${number}`

const editor = createEntityEditorStore<MyRow, MyRowKey>({
  tableName: 'my_table',
  key: {
    fields: ['mapId', 'difficulty'],
    getId: row => `${row.mapId}:${row.difficulty}`,
    getEntry: id => id,
  },
  createDefault,
  load: key => {
    const [mapId, difficulty] = key.split(':').map(Number)
    return service.getRow(mapId, difficulty)
  },
  save: service.saveRow,
})
```

Store responsibilities:

- Keep list state (`entries`, `loading`, `currentSearch`, `listLoaded`) in the module store.
- Spread `...editor` from `createEntityEditorStore` into the store return.
- Provide small compatibility wrappers such as `openEditor(id)`, `openNew()`, `saveEntry()`, and `deleteEntry(id)` when pages or list components already use them.
- Refresh the list after save/delete only when `listLoaded` is true.
- Use `SubTableManager` bindings for repeated child rows and let the factory combine parent and child SQL.

### 5. Build pages around store state

- List pages use `ModuleLayout`, `StyledDataTable`, and `ActionsColumn` before creating custom list UI.
- Editor pages use `EditorHeader`, `SqlQueryPanel`, and `Tabs` when the table has multiple logical sections.
- Editor pages should read SQL state from the store: `combinedDiffQuery`, `combinedFullQuery`, `combinedHasChanges`, and `combinedChangedFields`.
- Save through store actions such as `saveCurrent()` or a module wrapper like `saveEntry()`.
- Discard through `store.discardChanges()`.
- Do not compute SQL diff, changed fields, or dirty state inline in Vue pages.

### 6. Add field modifier composables

Each editor should expose an `useXxxFieldModifiers()` composable. It should read the store's `changedFields` or `combinedChangedFields` and expose `isFieldModified(field)` helpers. Do not duplicate diff logic in the composable.

### 7. Add routes and registry entries

- Add table routes to the owning module's `routes.ts`.
- For a new module, add one `AppModuleDefinition` in `src/modules/registry.ts` with `id`, `basePath`, `routes`, optional `navigation`, optional `i18n`, and optional `sessionStore`.
- Do not add routes directly in `src/router/index.ts` unless the route is global shell infrastructure.
- Add navigation only for top-level modules that should appear in the sidebar.

### 8. Add i18n

- Put module strings in `src/modules/<module>/i18n/en.json` and `fr.json`.
- Add every user-visible label, header, button, tooltip, empty state, and column name to both locales.
- New module locale files must be registered through `src/modules/registry.ts`.

### 9. Decide session aggregation explicitly

- A store can expose `getAllDiffQueries()` without being globally aggregated.
- Add `sessionStore` in `src/modules/registry.ts` only when the module should appear in the global SQL session page.
- Do not register child table stores globally if their parent module already aggregates their SQL.

### 10. Validate

Run focused diagnostics first, then full checks:

```bash
pnpm exec vue-tsc -b --pretty false
pnpm build
```

For DB-backed behavior, run `pnpm tauri dev` and manually test list loading, opening existing rows, creating new rows, discard, SQL preview, save, delete, and SQL debug output.

## Conventions

- **Path alias**: `@` maps to `src/`. Always use `@/` for imports, never relative paths crossing module boundaries.
- **Types**: Define types in `types/` subdirectory of each module. Mirror DB column names exactly (PascalCase or snake_case as used in the DB schema).
- **Rust commands**: Each command file in `src-tauri/src/commands/` handles one DB table. Register new commands in both `lib.rs` (`invoke_handler!`) and the `mod` declarations.
- **Debug SQL**: Use the `debug_sql!` macro in Rust commands to emit SQL events to the `SqlDebugViewer`. Never log credentials or sensitive values.
- **i18n**: All user-visible strings must use `t('key')`. Add keys to both `en.json` and `fr.json`.
- **PrimeVue components**: Use existing shared components (`EditableDataTable`, `StyledDataTable`, `BitmaskField`, `EditorField`) before creating new ones.

## Key Files

| File | Purpose |
|------|---------|
| `src/modules/registry.ts` | Module composition: routes, navigation, i18n, optional session stores |
| `src/modules/<module>/routes.ts` | Module-owned route definitions |
| `src/stores/createEntityEditorStore.ts` | Generic editor lifecycle, dirty cache, SQL aggregation, save/delete orchestration |
| `src/stores/SubTableManager.ts` | Reactive sub-table diff tracking |
| `src/composables/useQueryGenerator.ts` | SQL diff query generation |
| `src/stores/sessionChanges.ts` | Staged SQL query session |
| `src/stores/moduleStore.ts` | Cross-module state (active module, pending queries) |
| `src-tauri/src/lib.rs` | Tauri app entry — all command registrations |
| `src-tauri/src/debug.rs` | SQL debug event emission + `debug_sql!` macro |
| `src/router/index.ts` | Router shell, auth guard, and module route mounting |

## Editor Page Structure

An editor page (e.g. `CreatureTemplateEditor.vue`) follows a fixed layout:

```
<div class="<module>-editor">        ← max-width: 80rem
  <EditorHeader />                   ← back button + title + discard/execute buttons
  <SqlQueryPanel />                  ← diff SQL preview (collapsible)
  <Tabs value="<default-tab>">
    <TabList>
      <Tab value="…">Label</Tab>     ← one per logical section
    </TabList>
    <TabPanels>
      <TabPanel value="…">
        <XxxTab />                   ← extracted tab component (pages/editor/<table>/)
      </TabPanel>
    </TabPanels>
  </Tabs>
</div>
```

### `EditorHeader` props

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Module name (i18n key) |
| `subtitle` | `string?` | Record name (e.g. NPC name) |
| `id` | `string \| number?` | Primary key shown as `#<id>` |
| `backLabel` | `string?` | Back button label |
| `hasChanges` | `boolean` | Enables discard/execute buttons |
| `discardLabel` | `string?` | Discard button label |
| `executeLabel` | `string?` | Execute/save button label |

Events: `@back`, `@discard`, `@execute`

### `SqlQueryPanel` props

| Prop | Type | Description |
|------|------|-------------|
| `diffQuery` | `string` | UPDATE/INSERT/DELETE diff SQL |
| `fullQuery` | `string` | Full replacement SQL |
| `hasChanges` | `boolean` | Shows/hides the panel |
| `changedFields` | `ChangedField[]` | List of modified fields |

---

## Tab Component Structure

Each tab is a standalone `.vue` component (no props — it reads the module store directly). It is styled by importing the shared CSS:

```vue
<style scoped>
@import '../npc-editor.css';   <!-- or the equivalent path for your module -->
</style>
```

### Layout anatomy inside a tab

A tab is a flat sequence of **field groups**, each using the `.field-group` class:

```html
<div class="field-group">
  <div class="field-group-header">
    <h4>{{ t('…groups.sectionTitle') }}</h4>
    <p>{{ t('…groups.sectionDesc') }}</p>
  </div>
  <div class="field-grid">           <!-- 3-column grid by default -->
    <EditorField label="…" :modified="isFieldModified('fieldName')">
      <!-- PrimeVue input component -->
    </EditorField>
    …
  </div>
</div>
```

#### CSS classes (defined in `npc-editor.css`)

| Class | Description |
|-------|-------------|
| `.field-group` | Card container — dark bg, border, `border-radius: 0.75rem`, `padding: 1.5rem`, `margin-bottom: 1.5rem` |
| `.field-group-header h4` | Section title — `font-size: 1.1rem`, `color: #e2e8f0` |
| `.field-group-header p` | Section description — `font-size: 0.85rem`, `color: #94a3b8` |
| `.field-grid` | 3-column CSS grid with `gap: 1rem` |

---

## Shared UI Components

### `EditorField`

Wrapper for any single form input. Adds label, optional tooltip, and cyan highlight when the value differs from the DB.

```vue
<EditorField
  label="t('…')"
  :modified="isFieldModified('columnName')"
  :tooltip="t('…')"   <!-- optional -->
  :fullWidth="true"   <!-- optional — spans all 3 columns -->
>
  <InputNumber v-model="form.columnName" :useGrouping="false" fluid />
</EditorField>
```

- `modified` turns the label cyan (`#22d3ee`) and adds a 3 px left border.
- `fullWidth` sets `grid-column: 1 / -1`.
- Always pass `fluid` to PrimeVue inputs so they fill the column width.

### `BitmaskField`

Input for integer bitmask fields. Shows a read-only `InputNumber` with a `…` button that opens a PrimeVue `Dialog` listing all flags as `ToggleSwitch`.

```vue
<EditorField label="t('…')" :modified="isFieldModified('npcflag')">
  <BitmaskField
    v-model="form.npcflag"
    :options="npc_flags"       <!-- BitmaskOption[] from types/defines.ts -->
    :label="t('…')"
  />
</EditorField>
```

Dialog width is fixed at `36rem`.

### `EditableDataTable`

Inline editable `DataTable` for sub-table rows (spells, resistances, locales, etc.).

```vue
<EditableDataTable
  :entries="spellEntries"          <!-- reactive array from store sub-table -->
  :columns="spellColumns"          <!-- ColumnDef[] -->
  :hasChanges="spellHasChanges"
  :maxRows="8"
  :title="t('…groups.spells')"
  :description="t('…groups.spellsDesc')"
  dataKey="Index"
  @add="addSpell"
  @remove="removeSpell"
/>
```

`ColumnDef` types: `'number'`, `'text'`, `'select'`, `'readonly'`. Use `optionsFn` instead of `options` when available choices depend on sibling rows (e.g. to exclude already-used enum values).

---

## Field Modifier Pattern

Each editor exposes an `useXxxFieldModifiers()` composable (e.g. `useNpcFieldModifiers`) that returns helpers to check whether a given field differs from its original DB value:

```ts
const { isFieldModified, isMovementModified, isAddonModified } = useNpcFieldModifiers()
```

Use these exclusively to drive the `:modified` prop of `EditorField`. Never compute diffs inline inside a tab.

---

## Dark Theme — PrimeVue Input Overrides

PrimeVue inputs (`InputText`, `InputNumber`, `Select`) render with a **white/light background** by default unless explicit `:deep()` overrides are added to the editor component's `<style scoped>` block.

**Rule:** every editor page that does **not** use a `<Tabs>` wrapper (i.e. bare field-groups without `TabPanel`) **must** include the following block directly in its own `<style scoped>`:

```vue
<style scoped>
/* Override PrimeVue input styles for dark theme */
:deep(.p-inputtext),
:deep(.p-inputnumber-input) {
  background: rgba(15, 23, 42, 0.8) !important;
  border: 1px solid rgba(51, 65, 85, 0.6) !important;
  color: #e2e8f0 !important;
  height: 2.6rem !important;
}

:deep(.p-inputtext:focus),
:deep(.p-inputnumber-input:focus) {
  border-color: rgba(6, 182, 212, 0.5) !important;
  box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.15) !important;
}

:deep(.p-inputtext::placeholder),
:deep(.p-inputnumber-input::placeholder) {
  color: #475569 !important;
}

/* If the editor uses <Select> */
:deep(.p-select) {
  background: rgba(15, 23, 42, 0.8) !important;
  border: 1px solid rgba(51, 65, 85, 0.6) !important;
  color: #e2e8f0 !important;
  height: 2.6rem !important;
}

:deep(.p-select .p-select-label) {
  padding: 0 0.75rem !important;
  line-height: 2.6rem !important;
}

:deep(.p-select:focus),
:deep(.p-select.p-focus) {
  border-color: rgba(6, 182, 212, 0.5) !important;
  box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.15) !important;
}

:deep(.p-select-label) {
  color: #e2e8f0 !important;
}
</style>
```

Editors that **use `<Tabs>`** (e.g. `CreatureTemplateEditor.vue`) already include these overrides at the top-level editor component — tab child components do not need to repeat them.
