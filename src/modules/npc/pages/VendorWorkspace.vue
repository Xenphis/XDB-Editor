<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import EntityWorkspace from '@core/components/workspace/EntityWorkspace.vue'
import EntityListPanel from '@core/components/workspace/EntityListPanel.vue'
import InspectorPanel from '@core/components/workspace/InspectorPanel.vue'
import WorkspaceEmptyState from '@core/components/workspace/WorkspaceEmptyState.vue'
import EditorHeader from '@core/components/EditorHeader.vue'
import type {
  NpcVendorGroup,
  VendorCreatureOption,
  VendorItemOption,
} from '@/modules/npc/types/npc/npc_vendor'
import { UNIT_NPC_FLAG_VENDOR, itemQualityColor } from '@/modules/npc/types/npc/npc_vendor'
import { getNpcVendors, searchVendorCreatures, searchVendorItems } from '@/modules/npc/service'
import { useVendorStore, createStockEntry } from '@/modules/npc/stores/vendorStore'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useVendorStore()

/** undefined = no selection, number = the vendor's creature entry. */
const entry = computed<number | undefined>(() => {
  const param = route.params.entry as string | undefined
  if (param === undefined || param === '') return undefined
  const n = Number(param)
  return Number.isNaN(n) ? undefined : n
})

const loading = ref(false)

watch(entry, async (val) => {
  if (val === undefined) {
    store.closeEditor()
    return
  }
  if (store.editorDataLoaded && store.editingId === val) return
  loading.value = true
  try {
    await store.openEditor(val)
    await store.loadNpcflag(val)
  } catch (e) {
    console.error('Failed to load vendor:', e)
  } finally {
    loading.value = false
  }
}, { immediate: true })

// --- List (client-side filter: getNpcVendors returns every vendor at once) ---
const searchQuery = ref('')

const filteredVendors = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return store.vendors
  const n = Number(q)
  return store.vendors.filter(v =>
    (!isNaN(n) && v.entry === n) ||
    (v.name ?? '').toLowerCase().includes(q)
  )
})

async function loadVendors() {
  store.loading = true
  try {
    store.setVendors(await getNpcVendors())
    store.markListLoaded()
  } catch (e) {
    console.error('Failed to load vendors:', e)
  } finally {
    store.loading = false
  }
}

function titleOf(vendor: NpcVendorGroup): string {
  return `#${vendor.entry} ${vendor.name ?? ''}`.trim()
}

function metaOf(vendor: NpcVendorGroup): string {
  return t('vendor.itemCount', vendor.itemCount)
}

function onSelect(vendor: NpcVendorGroup) {
  router.push(`/npc/vendor/${vendor.entry}`)
}

onMounted(() => {
  if (!store.listLoaded) {
    loadVendors()
  }
})

// --- Pickers ---
type PickerMode = 'creature' | 'item'

const pickerOpen = ref(false)
const pickerMode = ref<PickerMode>('creature')
const pickerQuery = ref('')
const creatureResults = ref<VendorCreatureOption[]>([])
const itemResults = ref<VendorItemOption[]>([])
const pickerLoading = ref(false)

function openPicker(mode: PickerMode) {
  pickerMode.value = mode
  pickerQuery.value = ''
  creatureResults.value = []
  itemResults.value = []
  pickerOpen.value = true
}

async function runPickerSearch() {
  const query = pickerQuery.value.trim()
  if (!query) {
    creatureResults.value = []
    itemResults.value = []
    return
  }
  pickerLoading.value = true
  try {
    if (pickerMode.value === 'creature') {
      creatureResults.value = await searchVendorCreatures(query)
    } else {
      itemResults.value = await searchVendorItems(query)
    }
  } catch (e) {
    console.error('Failed to search:', e)
  } finally {
    pickerLoading.value = false
  }
}

/** A creature without the vendor npcflag never opens a vendor window, even
    with rows in npc_vendor — worth flagging, but not worth blocking. */
function isVendorFlagged(flag: number | null): boolean {
  return flag != null && (flag & UNIT_NPC_FLAG_VENDOR) !== 0
}

function creatureWarning(option: VendorCreatureOption): string | null {
  if (option.itemCount > 0) return t('vendor.picker.alreadyVendor', { count: option.itemCount })
  if (!isVendorFlagged(option.npcflag)) return t('vendor.picker.notFlagged')
  return null
}

/** (item, ExtendedCost) is the primary key: adding an item already sold for
    the same extended cost would overwrite the existing row, not add one. */
function isItemPickable(option: VendorItemOption): boolean {
  return !store.hasStockEntry(option.entry)
}

function onPickCreature(option: VendorCreatureOption) {
  pickerOpen.value = false
  router.push(`/npc/vendor/${option.entry}`)
}

function onPickItem(option: VendorItemOption) {
  if (!isItemPickable(option)) return
  pickerOpen.value = false
  store.addStockEntry(createStockEntry(option.entry, {
    itemName: option.name,
    itemQuality: option.Quality,
  }))
}

const qualityColor = itemQualityColor

// --- Editor ---
const stockEntries = computed(() => store.stock.getNewEntries())

const currentVendor = computed(() => store.vendors.find(v => v.entry === entry.value))

function removeStock(index: number) {
  store.stock.removeNewEntry(index)
}

async function onExecute() {
  try {
    await store.saveCurrent()
    await loadVendors()
  } catch (e) {
    console.error('Failed to save vendor:', e)
  }
}

function onDiscard() {
  store.discardChanges()
}

async function onRemoveVendor(vendor: NpcVendorGroup) {
  try {
    await store.deleteCurrent(vendor.entry)
    if (entry.value === vendor.entry) {
      router.push('/npc/vendor')
    }
    await loadVendors()
  } catch (e) {
    console.error('Failed to delete vendor:', e)
  }
}
</script>

<template>
  <EntityWorkspace storageKey="npc.vendor">
    <template #list>
      <EntityListPanel
        :items="filteredVendors"
        :idOf="(v: NpcVendorGroup) => v.entry"
        :titleOf="titleOf"
        :metaOf="metaOf"
        :selectedId="entry ?? null"
        :modifiedIds="store.modifiedIds"
        :loading="store.loading"
        :searchPlaceholder="t('vendor.searchPlaceholder')"
        removable
        @select="onSelect"
        @add="openPicker('creature')"
        @search="(q: string) => searchQuery = q"
        @remove="onRemoveVendor"
      />
    </template>

    <template #editor>
      <template v-if="entry !== undefined">
        <EditorHeader
          :subtitle="t('vendor.editorTitle')"
          :id="entry"
          table="npc_vendor"
          :showBack="false"
          :hasChanges="store.combinedHasChanges"
          :discardLabel="t('vendor.discard')"
          :executeLabel="t('vendor.execute')"
          @discard="onDiscard"
          @execute="onExecute"
        />

        <div v-if="loading" class="editor-loading">
          <i class="pi pi-spin pi-spinner"></i>
        </div>

        <template v-else>
          <div v-if="!isVendorFlagged(store.npcflag)" class="vendor-warning">
            <i class="pi pi-exclamation-triangle"></i>
            <span>{{ t('vendor.notFlaggedWarning') }}</span>
          </div>

          <!-- Stock -->
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('vendor.groups.stock') }}</h4>
              <p>{{ t('vendor.groups.stockDesc') }}</p>
            </div>

            <table class="vendor-table">
              <thead>
                <tr>
                  <th class="col-item">{{ t('vendor.columns.item') }}</th>
                  <th class="col-num">{{ t('vendor.columns.slot') }}</th>
                  <th class="col-num">{{ t('vendor.columns.maxcount') }}</th>
                  <th class="col-num">{{ t('vendor.columns.incrtime') }}</th>
                  <th class="col-num">{{ t('vendor.columns.extendedCost') }}</th>
                  <th class="col-action"></th>
                </tr>
              </thead>
              <tbody>
                <!-- Keyed by position: every other candidate (item, ExtendedCost)
                     is editable, and a key that changes as the user types would
                     re-create the row and drop focus mid-edit. -->
                <tr v-for="(row, index) in stockEntries" :key="index">
                  <td class="col-item">
                    <span class="vendor-item-id">#{{ row.item }}</span>
                    <span class="vendor-item-name" :style="{ color: qualityColor(row.itemQuality) }">
                      {{ row.itemName ?? t('vendor.unknownItem') }}
                    </span>
                  </td>
                  <td class="col-num">
                    <InputNumber v-model="row.slot" :useGrouping="false" :min="0" fluid />
                  </td>
                  <td class="col-num">
                    <InputNumber v-model="row.maxcount" :useGrouping="false" :min="0" fluid />
                  </td>
                  <td class="col-num">
                    <InputNumber v-model="row.incrtime" :useGrouping="false" :min="0" fluid />
                  </td>
                  <td class="col-num">
                    <InputNumber v-model="row.ExtendedCost" :useGrouping="false" :min="0" fluid />
                  </td>
                  <td class="col-action">
                    <Button
                      icon="pi pi-trash"
                      severity="danger"
                      text
                      rounded
                      size="small"
                      @click="removeStock(index)"
                    />
                  </td>
                </tr>
                <tr v-if="stockEntries.length === 0">
                  <td colspan="6" class="vendor-empty">{{ t('vendor.noItems') }}</td>
                </tr>
              </tbody>
            </table>

            <Button
              class="vendor-add"
              icon="pi pi-plus"
              severity="secondary"
              size="small"
              text
              :label="t('vendor.addItem')"
              @click="openPicker('item')"
            />
          </div>
        </template>
      </template>

      <WorkspaceEmptyState v-else />
    </template>

    <template #inspector>
      <InspectorPanel
        v-if="entry !== undefined"
        :title="t('workspace.inspector')"
        :subtitle="currentVendor?.name ?? undefined"
        storageKey="npc.vendor"
        :changedFields="store.combinedChangedFields"
        :diffQuery="store.combinedDiffQuery"
        :fullQuery="store.combinedFullQuery"
        :hasChanges="store.combinedHasChanges"
      >
        <template #facts>
          <dl class="vendor-facts">
            <div class="vendor-facts-row">
              <dt>{{ t('vendor.columns.entry') }}</dt>
              <dd>{{ entry ?? '—' }}</dd>
            </div>
            <div class="vendor-facts-row">
              <dt>{{ t('vendor.columns.npcflag') }}</dt>
              <dd>{{ store.npcflag ?? '—' }}</dd>
            </div>
            <div class="vendor-facts-row">
              <dt>{{ t('vendor.columns.items') }}</dt>
              <dd>{{ stockEntries.length }}</dd>
            </div>
          </dl>
        </template>
      </InspectorPanel>
    </template>
  </EntityWorkspace>

  <!-- Creature / item picker -->
  <Dialog
    v-model:visible="pickerOpen"
    modal
    :header="pickerMode === 'creature' ? t('vendor.picker.creatureTitle') : t('vendor.picker.itemTitle')"
    :style="{ width: '32rem' }"
  >
    <div class="picker-search">
      <InputText
        v-model="pickerQuery"
        :placeholder="pickerMode === 'creature' ? t('vendor.picker.creaturePlaceholder') : t('vendor.picker.itemPlaceholder')"
        fluid
        @keyup.enter="runPickerSearch"
      />
      <Button icon="pi pi-search" :loading="pickerLoading" @click="runPickerSearch" />
    </div>

    <ul class="picker-results">
      <template v-if="pickerMode === 'creature'">
        <li
          v-for="option in creatureResults"
          :key="option.entry"
          class="picker-row"
          @click="onPickCreature(option)"
        >
          <div>
            <span class="picker-id">#{{ option.entry }}</span>
            <span class="picker-name">{{ option.name ?? '—' }}</span>
          </div>
          <span v-if="creatureWarning(option)" class="picker-warning">{{ creatureWarning(option) }}</span>
        </li>
      </template>

      <template v-else>
        <li
          v-for="option in itemResults"
          :key="option.entry"
          class="picker-row"
          :class="{ disabled: !isItemPickable(option) }"
          @click="onPickItem(option)"
        >
          <div>
            <span class="picker-id">#{{ option.entry }}</span>
            <span class="picker-name" :style="{ color: qualityColor(option.Quality) }">{{ option.name }}</span>
          </div>
          <span v-if="!isItemPickable(option)" class="picker-warning">{{ t('vendor.picker.alreadySold') }}</span>
          <span v-else class="picker-meta">ilvl {{ option.ItemLevel }}</span>
        </li>
      </template>

      <li
        v-if="!pickerLoading && creatureResults.length === 0 && itemResults.length === 0"
        class="picker-empty"
      >
        {{ t('vendor.picker.empty') }}
      </li>
    </ul>
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

.vendor-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--warn);
  border-radius: var(--radius);
  color: var(--warn);
  font-size: var(--font-field);
}

.vendor-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-field);
}

.vendor-table th {
  text-align: left;
  font-size: var(--font-label);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  padding: 0 0.3rem 0.4rem;
}

.vendor-table td {
  padding: 0.25rem 0.3rem;
  border-top: 1px solid var(--border-default);
  vertical-align: middle;
}

.col-num {
  width: 6.5rem;
}

.col-action {
  width: 2.5rem;
}

.vendor-item-id {
  font-variant-numeric: tabular-nums;
  color: var(--text);
  margin-right: 0.4rem;
}

.vendor-empty,
.picker-empty {
  color: var(--text-muted);
  text-align: center;
  padding: 1rem 0;
}

.vendor-add {
  margin-top: 0.5rem;
}

.vendor-facts {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.vendor-facts-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.78rem;
}

.vendor-facts-row dt {
  color: var(--text-muted);
}

.vendor-facts-row dd {
  margin: 0;
  color: var(--text);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.picker-search {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.picker-results {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 18rem;
  overflow-y: auto;
}

.picker-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.45rem 0.5rem;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: var(--font-field);
}

.picker-row:hover {
  background: var(--surface-hover);
}

.picker-row.disabled {
  opacity: 0.45;
  cursor: default;
}

.picker-id {
  font-variant-numeric: tabular-nums;
  margin-right: 0.4rem;
}

.picker-name {
  color: var(--text-muted);
}

.picker-meta {
  color: var(--text-placeholder);
  font-size: 0.72rem;
}

.picker-warning {
  color: var(--warn);
  font-size: 0.72rem;
}
</style>
