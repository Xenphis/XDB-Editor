<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import EntityWorkspace from '@core/components/workspace/EntityWorkspace.vue'
import EntityListPanel from '@core/components/workspace/EntityListPanel.vue'
import InspectorPanel from '@core/components/workspace/InspectorPanel.vue'
import WorkspaceEmptyState from '@core/components/workspace/WorkspaceEmptyState.vue'
import EditorHeader from '@core/components/EditorHeader.vue'
import EditableDataTable, { type ColumnDef } from '@core/components/EditableDataTable.vue'
import LootTypeSelect from '../components/LootTypeSelect.vue'
import { LOOT_TABLE_NAMES, isLootType, type LootGroup, type LootType } from '../types'
import { createLootRow, useLootTemplateStore } from '../stores/lootTemplateStore'

/**
 * One workspace over the six profession loot tables, picked with the type
 * dropdown above the list. Structurally the vendor workspace: the "entity" is
 * an `Entry` that owns N rows, so the left pane lists entries and the right
 * pane edits their rows.
 *
 * Each type has its own store, so the route's `:type` decides which store this
 * page is bound to — and unsaved edits survive a trip through another type.
 */

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

/** Route `:type`, falling back to fishing on a hand-typed bad slug. */
const lootType = computed<LootType>(() => {
  const param = route.params.type
  return isLootType(param) ? param : 'fishing'
})

/** undefined = nothing selected, number = the loot Entry being edited. */
const entry = computed<number | undefined>(() => {
  const param = route.params.entry as string | undefined
  if (param === undefined || param === '') return undefined
  const n = Number(param)
  return Number.isNaN(n) ? undefined : n
})

const store = computed(() => useLootTemplateStore(lootType.value))

const loading = ref(false)

// Loading the list and opening an entry both key off the route, so one watcher
// covers a type switch, an entry switch, and the initial mount.
watch(
  [lootType, entry],
  async ([type, id], previous) => {
    const current = useLootTemplateStore(type)
    if (!current.listLoaded) {
      current.loadGroups().catch(e => console.error('Failed to load loot entries:', e))
    }

    if (id === undefined) {
      current.closeEditor()
      return
    }
    // Re-opening the entry already in the editor would throw away its edits.
    const typeChanged = previous !== undefined && previous[0] !== type
    if (!typeChanged && current.editorDataLoaded && current.editingId === id) return

    loading.value = true
    try {
      await current.openEditor(id)
    } catch (e) {
      console.error('Failed to load loot entry:', e)
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)

// --- List (client-side filter: getLootGroups returns every entry at once) ---
const searchQuery = ref('')

// Switching type must not carry the previous table's search over.
watch(lootType, () => { searchQuery.value = '' })

const filteredGroups = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return store.value.groups
  const n = Number(q)
  return store.value.groups.filter(g =>
    (!isNaN(n) && g.entry === n) ||
    (g.label ?? '').toLowerCase().includes(q),
  )
})

function titleOf(group: LootGroup): string {
  return `#${group.entry} ${group.label ?? ''}`.trim()
}

function metaOf(group: LootGroup): string {
  return t('lootAndItem.rowCount', group.rowCount)
}

function onSelect(group: LootGroup) {
  router.push(`/loot-items/${lootType.value}/${group.entry}`)
}

// --- Rows ---
const rowEntries = computed(() => store.value.rows.getNewEntries())
const rowsHaveChanges = computed(
  () => entry.value !== undefined && store.value.rows.getSqlDiff(entry.value).length > 0,
)

const columns = computed<ColumnDef[]>(() => [
  { field: 'Item', header: t('lootAndItem.columns.item'), type: 'number', width: '7rem' },
  { field: 'itemName', header: t('lootAndItem.columns.itemName'), type: 'readonly' },
  { field: 'Reference', header: t('lootAndItem.columns.reference'), type: 'number', width: '7rem' },
  {
    field: 'Chance',
    header: t('lootAndItem.columns.chance'),
    type: 'number',
    width: '6.5rem',
    fractionDigits: { min: 1, max: 2 },
  },
  { field: 'GroupId', header: t('lootAndItem.columns.groupId'), type: 'number', width: '5rem' },
  { field: 'MinCount', header: t('lootAndItem.columns.minCount'), type: 'number', width: '5rem' },
  { field: 'MaxCount', header: t('lootAndItem.columns.maxCount'), type: 'number', width: '5rem' },
  { field: 'LootMode', header: t('lootAndItem.columns.lootMode'), type: 'number', width: '5.5rem' },
  {
    field: 'QuestRequired',
    header: t('lootAndItem.columns.questRequired'),
    type: 'select',
    width: '7rem',
    options: [
      { value: false, label: t('lootAndItem.no') },
      { value: true, label: t('lootAndItem.yes') },
    ],
  },
  { field: 'Comment', header: t('lootAndItem.columns.comment'), type: 'text' },
])

/** Next free `Item`, so a fresh row never collides with an existing one —
    `(Entry, Item)` is the primary key. */
function addRow() {
  let item = 1
  while (store.value.hasRow(item)) item += 1
  store.value.addRow(createLootRow(item, { Entry: entry.value ?? 0 }))
}

function removeRow(index: number) {
  store.value.removeRow(index)
}

// --- New entry ---
const newEntryOpen = ref(false)
const newEntryId = ref<number | null>(null)

function openNewEntry() {
  newEntryId.value = null
  newEntryOpen.value = true
}

function confirmNewEntry() {
  const id = newEntryId.value
  if (id == null || id <= 0) return
  newEntryOpen.value = false
  router.push(`/loot-items/${lootType.value}/${id}`)
}

// --- Save / delete ---
async function onExecute() {
  try {
    await store.value.saveCurrent()
    await store.value.loadGroups()
  } catch (e) {
    console.error('Failed to save loot entry:', e)
  }
}

function onDiscard() {
  store.value.discardChanges()
}

async function onRemoveEntry(group: LootGroup) {
  try {
    await store.value.deleteCurrent(group.entry)
    if (entry.value === group.entry) {
      router.push(`/loot-items/${lootType.value}`)
    }
    await store.value.loadGroups()
  } catch (e) {
    console.error('Failed to delete loot entry:', e)
  }
}
</script>

<template>
  <EntityWorkspace storageKey="loot">
    <template #list>
      <LootTypeSelect :modelValue="lootType" />
      <EntityListPanel
        :items="filteredGroups"
        :idOf="(g: LootGroup) => g.entry"
        :titleOf="titleOf"
        :metaOf="metaOf"
        :selectedId="entry ?? null"
        :modifiedIds="store.modifiedIds"
        :loading="store.loading"
        :searchPlaceholder="t('lootAndItem.searchPlaceholder')"
        removable
        @select="onSelect"
        @add="openNewEntry"
        @search="(q: string) => searchQuery = q"
        @remove="onRemoveEntry"
      />
    </template>

    <template #editor>
      <template v-if="entry !== undefined">
        <EditorHeader
          :subtitle="t(`lootAndItem.submodules.${lootType}.title`)"
          :id="entry"
          :table="LOOT_TABLE_NAMES[lootType]"
          :showBack="false"
          :hasChanges="store.combinedHasChanges"
          :discardLabel="t('lootAndItem.discard')"
          :executeLabel="t('lootAndItem.execute')"
          @discard="onDiscard"
          @execute="onExecute"
        />

        <div v-if="loading" class="editor-loading">
          <i class="pi pi-spin pi-spinner"></i>
        </div>

        <div v-else class="field-group" :class="{ 'field-group-modified': rowsHaveChanges }">
          <EditableDataTable
            :entries="rowEntries"
            :columns="columns"
            :hasChanges="rowsHaveChanges"
            :title="t('lootAndItem.groups.rows')"
            :description="t(`lootAndItem.submodules.${lootType}.description`)"
            dataKey="Item"
            showHeaderAdd
            embedded
            @add="addRow"
            @remove="removeRow"
          />
        </div>
      </template>

      <WorkspaceEmptyState v-else />
    </template>

    <template #inspector>
      <InspectorPanel
        v-if="entry !== undefined"
        :title="t('workspace.inspector')"
        :subtitle="LOOT_TABLE_NAMES[lootType]"
        storageKey="loot"
        :changedFields="store.combinedChangedFields"
        :diffQuery="store.combinedDiffQuery"
        :fullQuery="store.combinedFullQuery"
        :hasChanges="store.combinedHasChanges"
      >
        <template #facts>
          <dl class="loot-facts">
            <div class="loot-facts-row">
              <dt>{{ t('lootAndItem.columns.entry') }}</dt>
              <dd>{{ entry }}</dd>
            </div>
            <div class="loot-facts-row">
              <dt>{{ t('lootAndItem.entryMeaning') }}</dt>
              <dd>{{ t(`lootAndItem.entryKind.${lootType}`) }}</dd>
            </div>
            <div class="loot-facts-row">
              <dt>{{ t('lootAndItem.columns.rows') }}</dt>
              <dd>{{ rowEntries.length }}</dd>
            </div>
          </dl>
        </template>
      </InspectorPanel>
    </template>
  </EntityWorkspace>

  <!-- New entry: the id is not ours to invent — it must match whatever the
       table keys off (a zone, an item, a creature's loot id). -->
  <Dialog
    v-model:visible="newEntryOpen"
    modal
    :header="t('lootAndItem.newEntry.title')"
    :style="{ width: '26rem' }"
  >
    <p class="new-entry-hint">{{ t(`lootAndItem.entryHint.${lootType}`) }}</p>
    <InputNumber
      v-model="newEntryId"
      :useGrouping="false"
      :min="1"
      autofocus
      fluid
      @keyup.enter="confirmNewEntry"
    />
    <template #footer>
      <Button
        :label="t('lootAndItem.newEntry.cancel')"
        severity="secondary"
        text
        @click="newEntryOpen = false"
      />
      <Button
        :label="t('lootAndItem.newEntry.confirm')"
        :disabled="newEntryId == null || newEntryId <= 0"
        @click="confirmNewEntry"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.editor-loading {
  display: flex;
  justify-content: center;
  padding: 3rem 0;
  color: var(--accent);
  font-size: 1.5rem;
}

.loot-facts {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
}

.loot-facts-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.loot-facts-row dt {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.loot-facts-row dd {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text);
  text-align: right;
}

.new-entry-hint {
  margin: 0 0 0.75rem;
  font-size: 0.82rem;
  color: var(--text-muted);
  line-height: 1.45;
}
</style>
