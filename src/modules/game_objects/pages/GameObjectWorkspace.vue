<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Button from 'primevue/button'
import Column from 'primevue/column'
import Popover from 'primevue/popover'
import { useGameObjectEnumOptions } from '@/modules/game_objects/composables/useGameObjectEnumOptions'
import type { GameObjectTemplate } from '@/modules/game_objects/types/gameobject_template/gameobject_template'
import type { GameObject } from '@/modules/game_objects/types/gameobject/gameobject'
import { getGameObjects, getGameObjectSpawns, saveGameObjectSpawn, deleteGameObjectSpawn } from '@/modules/game_objects/service'
import GameObjectSpawnEditor, { type GoSpawnInspectorState } from './GameObjectSpawnEditor.vue'
import GameObjectLocaleTab from './GameObjectLocaleTab.vue'
import EntityWorkspace from '@core/components/workspace/EntityWorkspace.vue'
import EntityListPanel from '@core/components/workspace/EntityListPanel.vue'
import ObjectTableSwitch from '@/modules/object/ObjectTableSwitch.vue'
import InspectorPanel from '@core/components/workspace/InspectorPanel.vue'
import WorkspaceEmptyState from '@core/components/workspace/WorkspaceEmptyState.vue'
import EditorHeader from '@core/components/EditorHeader.vue'
import SectionTabs, { type SectionTabItem } from '@core/components/SectionTabs.vue'
import ModelViewer from '@/modules/model_viewer/components/ModelViewer.vue'
import ModelSearchDialog from '@/modules/model_search/components/ModelSearchDialog.vue'
import EditorField from '@core/components/EditorField.vue'
import StyledDataTable from '@core/components/StyledDataTable.vue'
import SmartScriptsPanel from '@/modules/smart_scripts/pages/SmartScriptsPanel.vue'
import { useSmartScriptsStore } from '@/modules/smart_scripts/stores/smartScriptsStore'
import ActionsColumn from '@core/components/ActionsColumn.vue'
import EditableDataTable, { type ColumnDef } from '@core/components/EditableDataTable.vue'
import { useGameObjectModuleStore } from '@/modules/game_objects/store'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useGameObjectModuleStore()

const { gameObjectTypeOptions: typeOptions } = useGameObjectEnumOptions()

/** undefined = no selection, null = create mode, number = edit. */
const entryParam = computed<number | null | undefined>(() => {
  const param = route.params.entry as string | undefined
  if (param === undefined || param === '') return undefined
  if (param === 'new') return null
  const n = Number(param)
  return Number.isNaN(n) ? undefined : n
})

const loading = ref(false)
const form = store.formData

// --- Model search (picker dialog for the displayId field) ---
const modelDialogVisible = ref(false)
function onModelSelect(displayId: number) {
  form.displayId = displayId
}

// --- List ---
function metaOf(go: GameObjectTemplate): string {
  const type = typeOptions.value.find(o => o.value === go.type)?.name ?? `Type ${go.type}`
  return `#${go.entry} · ${type} · display ${go.displayId}`
}

async function loadGameObjects() {
  store.loading = true
  try {
    const result = await getGameObjects(store.currentSearch || undefined, store.currentTypeFilter ?? undefined, 50)
    store.setGameObjects(result.data)
    store.markListLoaded()
  } catch (e) {
    console.error('Failed to load game objects:', e)
  } finally {
    store.loading = false
  }
}

async function onListSearch(query: string) {
  store.currentSearch = query
  await loadGameObjects()
}

// --- Type filter ---
const typeFilterPopover = ref<InstanceType<typeof Popover> | null>(null)

const typeFilter = computed<number | null>({
  get: () => store.currentTypeFilter,
  set: (val) => { store.currentTypeFilter = val ?? null },
})

function onTypeFilterToggle(event: Event) {
  typeFilterPopover.value?.toggle(event)
}

watch(typeFilter, () => {
  loadGameObjects()
})

function onListSelect(go: GameObjectTemplate) {
  router.push(`/object/gameobject-template/${go.entry}`)
}

function onListAdd() {
  router.push('/object/gameobject-template/new')
}

async function onListRemove(go: GameObjectTemplate) {
  try {
    await store.deleteCurrent(go.entry)
    if (entryParam.value === go.entry) {
      router.push('/object/gameobject-template')
    }
    await loadGameObjects()
  } catch (e) {
    console.error('Failed to delete game object:', e)
  }
}

onMounted(() => {
  if (!store.listLoaded) {
    loadGameObjects()
  }
})

// --- Field modification helpers ---
const modifiedFieldSet = computed(() => new Set(store.changedFields.map(c => c.field)))
function isFieldModified(field: string): boolean {
  return modifiedFieldSet.value.has(field)
}

const addonChangedFields = computed(() => store.addon.getChangedFields(form.entry))
const addonModifiedFieldSet = computed(() => new Set(addonChangedFields.value.map(c => c.field)))
function isAddonModified(field: string): boolean {
  return addonModifiedFieldSet.value.has(field)
}

// --- Addon form ---
const addonForm = store.addon.newEntry

// --- Loot ---
const lootEntries = computed(() => store.loot.getNewEntries())
const lootHasChanges = computed(() => store.loot.getSqlDiff(form.entry).length > 0)

const lootColumns: ColumnDef[] = [
  { field: 'Item', header: t('gameobjectEditor.fields.loot_item'), type: 'number', width: '7rem' },
  { field: 'Chance', header: t('gameobjectEditor.fields.loot_chance'), type: 'number', width: '6rem', fractionDigits: { min: 1, max: 2 } },
  { field: 'MinCount', header: t('gameobjectEditor.fields.loot_min_count'), type: 'number', width: '5rem' },
  { field: 'MaxCount', header: t('gameobjectEditor.fields.loot_max_count'), type: 'number', width: '5rem' },
  { field: 'Comment', header: t('gameobjectEditor.fields.loot_comment'), type: 'text' },
]

function addLoot() {
  store.loot.pushNewEntry({
    Item: 0, Reference: 0, Chance: 100, QuestRequired: false,
    LootMode: 1, GroupId: 0, MinCount: 1, MaxCount: 1, Comment: '',
  })
}

function removeLoot(index: number) {
  store.loot.removeNewEntry(index)
}

// --- Quest relations ---
const questStarterEntries = computed(() => store.questStarters.getNewEntries())
const questEnderEntries = computed(() => store.questEnders.getNewEntries())
const questStartersHasChanges = computed(() => store.questStarters.getSqlDiff(form.entry).length > 0)
const questEndersHasChanges = computed(() => store.questEnders.getSqlDiff(form.entry).length > 0)

function addQuestStarter() {
  store.questStarters.pushNewEntry({ id: form.entry, quest: 0 })
}
function removeQuestStarter(index: number) {
  store.questStarters.removeNewEntry(index)
}
function addQuestEnder() {
  store.questEnders.pushNewEntry({ id: form.entry, quest: 0 })
}
function removeQuestEnder(index: number) {
  store.questEnders.removeNewEntry(index)
}

// --- Quest items (gameobject_questitem) ---
const MAX_QUEST_ITEMS = 6
const questItemEntries = computed(() => store.questItems.getNewEntries())
const questItemHasChanges = computed(() => store.questItems.getSqlDiff(form.entry).length > 0)

const questItemColumns: ColumnDef[] = [
  { field: 'Idx', header: t('gameobjectEditor.fields.questItem_idx'), type: 'readonly', width: '5rem' },
  { field: 'ItemId', header: t('gameobjectEditor.fields.questItem_itemId'), type: 'number' },
]

function addQuestItem() {
  if (questItemEntries.value.length >= MAX_QUEST_ITEMS) return
  const usedIdx = new Set(questItemEntries.value.map(e => e.Idx))
  let nextIdx = 0
  while (usedIdx.has(nextIdx) && nextIdx < MAX_QUEST_ITEMS) nextIdx++
  if (nextIdx >= MAX_QUEST_ITEMS) return
  store.questItems.pushNewEntry({ Idx: nextIdx, ItemId: 0 })
}

function removeQuestItem(index: number) {
  store.questItems.removeNewEntry(index)
}

// --- Spawn state ---
const spawns = ref<GameObject[]>([])
const spawnsLoading = ref(false)
const editingSpawnGuid = ref<number | null>(null)

// Filled by GameObjectSpawnEditor so the right rail can show the spawn's SQL/diff.
const spawnInspector = reactive<GoSpawnInspectorState>({
  diffQuery: '',
  fullQuery: '',
  hasChanges: false,
  changedFields: [],
})

async function loadSpawns() {
  const entry = entryParam.value
  if (entry == null) {
    spawns.value = []
    return
  }
  spawnsLoading.value = true
  try {
    spawns.value = await getGameObjectSpawns(entry)
  } catch (e) {
    console.error('Failed to load spawns:', e)
  } finally {
    spawnsLoading.value = false
  }
}

function onEditSpawn(spawn: GameObject) {
  editingSpawnGuid.value = spawn.guid
}

async function onDeleteSpawn(spawn: GameObject) {
  try {
    await deleteGameObjectSpawn(spawn.guid)
    await loadSpawns()
  } catch (e) {
    console.error('Failed to delete spawn:', e)
  }
}

function onSpawnEditorClose() {
  editingSpawnGuid.value = null
  loadSpawns()
}

async function onSpawnEditorSave(data: GameObject) {
  try {
    await saveGameObjectSpawn(data)
    editingSpawnGuid.value = null
    await loadSpawns()
  } catch (e) {
    console.error('Failed to save spawn:', e)
  }
}

// --- Save / Discard ---
async function onSave() {
  try {
    const savedEntry = form.entry
    await store.saveCurrent()
    // The SmartAI tab edits smart_scripts through its own store: save it under
    // the same button so "execute" covers everything shown in this editor.
    if (saiHasChanges.value) {
      await saiStore.saveScript()
    }
    await loadGameObjects()
    if (entryParam.value === null && savedEntry) {
      router.push(`/object/gameobject-template/${savedEntry}`)
    }
  } catch (e) {
    console.error('Failed to save game object:', e)
  }
}

function onDiscard() {
  store.discardChanges()
  if (saiHasChanges.value) {
    saiStore.discardChanges()
  }
}

// --- Load data on selection change ---
watch(entryParam, async (val) => {
  editingSpawnGuid.value = null
  if (val === undefined) {
    store.closeEditor()
    return
  }
  if (store.editorDataLoaded && store.editingEntry === val) {
    loadSpawns()
    return
  }
  loading.value = true
  try {
    await store.openEditor(val)
  } catch (e) {
    console.error('Failed to load game object:', e)
  } finally {
    loading.value = false
  }
  loadSpawns()
}, { immediate: true })

// --- SmartAI tab (separate store, folded into this editor's save/discard) ---
const saiStore = useSmartScriptsStore()
const saiHasChanges = computed(() => Boolean(form.entry) && saiStore.hasChangesFor(form.entry, 1))
const editorHasChanges = computed(() => store.combinedHasChanges || saiHasChanges.value)

// Deep links from the SQL session panel land straight on the SmartAI tab.
const initialTab = computed(() => (route.query.tab === 'sai' ? 'sai' : 'general'))

// --- Tabs ---
const mainTabs = computed<SectionTabItem[]>(() => [
  { value: 'general', label: t('gameobjectEditor.tabs.general') },
  { value: 'data', label: t('gameobjectEditor.tabs.data') },
  { value: 'loot', label: t('gameobjectEditor.tabs.loot') },
  { value: 'locale', label: t('gameobjectEditor.tabs.locale') },
  { value: 'spawn', label: t('gameobjectEditor.tabs.spawn'), count: spawns.value.length },
  { value: 'sai', label: t('gameobjectEditor.tabs.sai') },
])
</script>

<template>
  <EntityWorkspace storageKey="object">
    <template #list>
      <ObjectTableSwitch />
      <EntityListPanel
        :items="store.gameObjects"
        :idOf="(g: GameObjectTemplate) => g.entry"
        :titleOf="(g: GameObjectTemplate) => g.name"
        :metaOf="metaOf"
        :selectedId="entryParam ?? null"
        :modifiedIds="store.modifiedIds"
        :loading="store.loading"
        :searchPlaceholder="t('gameobject.searchPlaceholder')"
        removable
        @select="onListSelect"
        @add="onListAdd"
        @search="onListSearch"
        @remove="onListRemove"
      >
        <template #filters>
          <button
            type="button"
            class="type-filter-toggle"
            :class="{ active: typeFilter !== null }"
            v-tooltip.bottom="t('gameobject.filterByType')"
            @click="onTypeFilterToggle"
          >
            <i class="pi pi-filter"></i>
          </button>
          <Popover ref="typeFilterPopover">
            <Select
              v-model="typeFilter"
              :options="typeOptions"
              optionLabel="name"
              optionValue="value"
              :placeholder="t('gameobject.filterByType')"
              showClear
              class="type-filter-select"
            />
          </Popover>
        </template>
      </EntityListPanel>
    </template>

    <template #editor>
      <!-- Spawn Editor -->
      <GameObjectSpawnEditor
        v-if="editingSpawnGuid != null"
        :spawnGuid="editingSpawnGuid"
        :goEntry="form.entry"
        :inspector="spawnInspector"
        @close="onSpawnEditorClose"
        @save="onSpawnEditorSave"
      />

      <template v-else-if="entryParam !== undefined">
        <EditorHeader
          :subtitle="form.name || t('gameobjectEditor.editorTitle')"
          :id="form.entry"
          table="gameobject_template"
          :showBack="false"
          :hasChanges="editorHasChanges"
          :discardLabel="t('gameobjectEditor.discard')"
          :executeLabel="t('gameobjectEditor.execute')"
          @discard="onDiscard"
          @execute="onSave"
        />

        <div v-if="loading" class="editor-loading">
          <i class="pi pi-spin pi-spinner"></i>
        </div>

        <SectionTabs v-else :tabs="mainTabs" variant="plain" :defaultValue="initialTab">
        <!-- ==================== GENERAL ==================== -->
        <template #general>
          <!-- Identification -->
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('gameobjectEditor.groups.identification') }}</h4>
              <p>{{ t('gameobjectEditor.groups.identificationDesc') }}</p>
            </div>
            <div class="field-grid">
              <EditorField :label="t('gameobjectEditor.fields.entry')" :tooltip="t('gameobjectEditor.tooltips.entry')" :modified="isFieldModified('entry')">
                <InputNumber v-model="form.entry" :useGrouping="false" fluid />
              </EditorField>
              <EditorField :label="t('gameobjectEditor.fields.name')" :tooltip="t('gameobjectEditor.tooltips.name')" :modified="isFieldModified('name')">
                <InputText v-model="form.name" fluid />
              </EditorField>
              <EditorField :label="t('gameobjectEditor.fields.displayId')" :tooltip="t('gameobjectEditor.tooltips.displayId')" :modified="isFieldModified('displayId')">
                <div class="model-field">
                  <InputNumber v-model="form.displayId" :useGrouping="false" fluid />
                  <Button
                    type="button"
                    icon="pi pi-search"
                    severity="secondary"
                    class="model-search-btn"
                    v-tooltip.bottom="t('modelSearch.searchTooltip')"
                    @click="modelDialogVisible = true"
                  />
                </div>
              </EditorField>
            </div>
          </div>

          <!-- Basic Information -->
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('gameobjectEditor.groups.basicInfo') }}</h4>
              <p>{{ t('gameobjectEditor.groups.basicInfoDesc') }}</p>
            </div>
            <div class="field-grid">
              <EditorField :label="t('gameobjectEditor.fields.type')" :tooltip="t('gameobjectEditor.tooltips.type')" :modified="isFieldModified('type')">
                <Select v-model="form.type" :options="typeOptions" optionLabel="name" optionValue="value" fluid />
              </EditorField>
              <EditorField :label="t('gameobjectEditor.fields.size')" :tooltip="t('gameobjectEditor.tooltips.size')" :modified="isFieldModified('size')">
                <InputNumber v-model="form.size" :minFractionDigits="1" :maxFractionDigits="5" :useGrouping="false" fluid />
              </EditorField>
              <EditorField :label="t('gameobjectEditor.fields.IconName')" :modified="isFieldModified('IconName')">
                <InputText v-model="form.IconName" fluid />
              </EditorField>
              <EditorField :label="t('gameobjectEditor.fields.castBarCaption')" :modified="isFieldModified('castBarCaption')">
                <InputText v-model="form.castBarCaption" fluid />
              </EditorField>
              <EditorField :label="t('gameobjectEditor.fields.unk1')" :modified="isFieldModified('unk1')">
                <InputText v-model="form.unk1" fluid />
              </EditorField>
              <EditorField :label="t('gameobjectEditor.fields.AIName')" :modified="isFieldModified('AIName')">
                <InputText v-model="form.AIName" fluid />
              </EditorField>
              <EditorField :label="t('gameobjectEditor.fields.ScriptName')" :modified="isFieldModified('ScriptName')">
                <InputText v-model="form.ScriptName" fluid />
              </EditorField>
              <EditorField :label="t('gameobjectEditor.fields.StringId')" :modified="isFieldModified('StringId')">
                <InputText v-model="form.StringId" fluid />
              </EditorField>
              <EditorField :label="t('gameobjectEditor.fields.VerifiedBuild')" :modified="isFieldModified('VerifiedBuild')">
                <InputNumber v-model="form.VerifiedBuild" :useGrouping="false" fluid />
              </EditorField>
            </div>
          </div>

          <!-- Addon -->
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('gameobjectEditor.groups.addon') }}</h4>
              <p>{{ t('gameobjectEditor.groups.addonDesc') }}</p>
            </div>
            <div class="field-grid">
              <EditorField :label="t('gameobjectEditor.fields.addon_faction')" :modified="isAddonModified('faction')">
                <InputNumber v-model="addonForm.faction" :useGrouping="false" fluid />
              </EditorField>
              <EditorField :label="t('gameobjectEditor.fields.addon_flags')" :modified="isAddonModified('flags')">
                <InputNumber v-model="addonForm.flags" :useGrouping="false" fluid />
              </EditorField>
              <EditorField :label="t('gameobjectEditor.fields.addon_mingold')" :modified="isAddonModified('mingold')">
                <InputNumber v-model="addonForm.mingold" :useGrouping="false" fluid />
              </EditorField>
              <EditorField :label="t('gameobjectEditor.fields.addon_maxgold')" :modified="isAddonModified('maxgold')">
                <InputNumber v-model="addonForm.maxgold" :useGrouping="false" fluid />
              </EditorField>
              <EditorField :label="t('gameobjectEditor.fields.addon_artkit0')" :modified="isAddonModified('artkit0')">
                <InputNumber v-model="addonForm.artkit0" :useGrouping="false" fluid />
              </EditorField>
              <EditorField :label="t('gameobjectEditor.fields.addon_artkit1')" :modified="isAddonModified('artkit1')">
                <InputNumber v-model="addonForm.artkit1" :useGrouping="false" fluid />
              </EditorField>
              <EditorField :label="t('gameobjectEditor.fields.addon_artkit2')" :modified="isAddonModified('artkit2')">
                <InputNumber v-model="addonForm.artkit2" :useGrouping="false" fluid />
              </EditorField>
              <EditorField :label="t('gameobjectEditor.fields.addon_artkit3')" :modified="isAddonModified('artkit3')">
                <InputNumber v-model="addonForm.artkit3" :useGrouping="false" fluid />
              </EditorField>
            </div>
          </div>
        </template>

        <!-- ==================== DATA ==================== -->
        <template #data>
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('gameobjectEditor.groups.dataFields') }}</h4>
              <p>{{ t('gameobjectEditor.groups.dataFieldsDesc') }}</p>
            </div>
            <div class="field-grid">
              <EditorField v-for="i in 24" :key="i - 1" :label="`Data${i - 1}`" :modified="isFieldModified(`Data${i - 1}`)">
                <InputNumber v-model="(form as any)[`Data${i - 1}`]" :useGrouping="false" fluid />
              </EditorField>
            </div>
          </div>
        </template>

        <!-- ==================== LOOT & QUESTS ==================== -->
        <template #loot>
          <div class="field-group" :class="{ 'field-group-modified': lootHasChanges }">
            <EditableDataTable
              :entries="lootEntries"
              :columns="lootColumns"
              :hasChanges="lootHasChanges"
              :title="t('gameobjectEditor.groups.loot')"
              :description="t('gameobjectEditor.groups.lootDesc')"
              dataKey="Item"
              showHeaderAdd
              embedded
              @add="addLoot"
              @remove="removeLoot"
            />
          </div>

          <div class="field-group" :class="{ 'field-group-modified': questItemHasChanges }">
            <EditableDataTable
              :entries="questItemEntries"
              :columns="questItemColumns"
              :hasChanges="questItemHasChanges"
              :title="t('gameobjectEditor.groups.questItems')"
              :description="t('gameobjectEditor.groups.questItemsDesc')"
              dataKey="Idx"
              showHeaderAdd
              embedded
              @add="addQuestItem"
              @remove="removeQuestItem"
            />
          </div>

          <div class="field-group" :class="{ 'field-group-modified': questStartersHasChanges || questEndersHasChanges }">
            <div class="field-group-header">
              <h4>{{ t('gameobject_quests.sectionTitle') }}</h4>
            </div>
            <div class="quest-rel-grid">
              <div class="quest-rel-col">
                <div class="quest-col-title">{{ t('gameobject_quests.starters') }}</div>
                <div class="quest-col-desc">{{ t('gameobject_quests.startersDesc') }}</div>
                <div v-if="questStarterEntries.length === 0" class="qrel-empty">{{ t('gameobject_quests.empty') }}</div>
                <div v-for="(entry, idx) in questStarterEntries" :key="idx" class="qrel-row">
                  <span class="qrel-tag">{{ t('gameobject_quests.quest') }}</span>
                  <InputNumber v-model="entry.quest" :useGrouping="false" :min="0" :placeholder="t('gameobject_quests.questPlaceholder')" fluid />
                  <Button icon="pi pi-trash" severity="danger" text size="small" @click="removeQuestStarter(idx)" />
                </div>
                <div class="qrel-add-row">
                  <Button icon="pi pi-plus" :label="t('gameobject_quests.add')" severity="secondary" size="small" @click="addQuestStarter" />
                </div>
              </div>
              <div class="quest-rel-col">
                <div class="quest-col-title">{{ t('gameobject_quests.enders') }}</div>
                <div class="quest-col-desc">{{ t('gameobject_quests.endersDesc') }}</div>
                <div v-if="questEnderEntries.length === 0" class="qrel-empty">{{ t('gameobject_quests.empty') }}</div>
                <div v-for="(entry, idx) in questEnderEntries" :key="idx" class="qrel-row">
                  <span class="qrel-tag">{{ t('gameobject_quests.quest') }}</span>
                  <InputNumber v-model="entry.quest" :useGrouping="false" :min="0" :placeholder="t('gameobject_quests.questPlaceholder')" fluid />
                  <Button icon="pi pi-trash" severity="danger" text size="small" @click="removeQuestEnder(idx)" />
                </div>
                <div class="qrel-add-row">
                  <Button icon="pi pi-plus" :label="t('gameobject_quests.add')" severity="secondary" size="small" @click="addQuestEnder" />
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- ==================== LOCALE ==================== -->
        <template #locale>
          <GameObjectLocaleTab />
        </template>

        <!-- ==================== SPAWN ==================== -->
        <template #spawn>
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('gameobjectEditor.groups.spawns') }}</h4>
              <p>{{ t('gameobjectEditor.groups.spawnsDesc') }}</p>
            </div>
            <StyledDataTable
              :data="spawns"
              dataKey="guid"
              @edit="onEditSpawn"
              @delete="onDeleteSpawn"
            >
              <Column field="guid" header="GUID" style="width: 6rem" />
              <Column field="map" header="Map" style="width: 5rem" />
              <Column header="Position" style="min-width: 16rem">
                <template #body="{ data }">
                  {{ data.position_x.toFixed(2) }}, {{ data.position_y.toFixed(2) }}, {{ data.position_z.toFixed(2) }}
                </template>
              </Column>
              <Column field="spawntimesecs" header="Spawn Time" style="width: 8rem" />
              <Column header="Actions" style="width: 8rem" headerStyle="text-align: right" bodyStyle="text-align: right">
                <template #body="{ data }">
                  <ActionsColumn :data="data" @edit="onEditSpawn" @delete="onDeleteSpawn" />
                </template>
              </Column>
            </StyledDataTable>
          </div>
        </template>

        <!-- ==================== SMARTAI ==================== -->
        <template #sai>
          <SmartScriptsPanel v-if="form.entry" :entryorguid="form.entry" :sourceType="1" />
        </template>
        </SectionTabs>
      </template>

      <WorkspaceEmptyState v-else />
    </template>

    <template #inspector>
      <!-- Spawn inspector (right rail) while editing a gameobject spawn -->
      <InspectorPanel
        v-if="editingSpawnGuid != null"
        :title="t('workspace.inspector')"
        :subtitle="`${t('gameobjectSpawnEditor.editorTitle')} #${editingSpawnGuid}`"
        storageKey="gameobject.spawn"
        :changedFields="spawnInspector.changedFields"
        :diffQuery="spawnInspector.diffQuery"
        :fullQuery="spawnInspector.fullQuery"
        :hasChanges="spawnInspector.hasChanges"
      >
        <template #preview>
          <ModelViewer kind="gameobject" :displayId="form.displayId" />
        </template>
      </InspectorPanel>

      <InspectorPanel
        v-else-if="entryParam !== undefined"
        :title="t('workspace.inspector')"
        :subtitle="form.name || undefined"
        storageKey="gameobject"
        :changedFields="store.combinedChangedFields"
        :diffQuery="store.combinedDiffQuery"
        :fullQuery="store.combinedFullQuery"
        :hasChanges="store.combinedHasChanges"
      >
        <template #preview>
          <ModelViewer kind="gameobject" :displayId="form.displayId" />
        </template>
        <template #facts>
          <dl class="go-facts">
            <div class="go-facts-row">
              <dt>{{ t('gameobjectEditor.modelPanel.displayId') }}</dt>
              <dd>{{ form.displayId || t('gameobjectEditor.modelPanel.none') }}</dd>
            </div>
            <div class="go-facts-row">
              <dt>{{ t('gameobjectEditor.modelPanel.size') }}</dt>
              <dd>{{ form.size ?? t('gameobjectEditor.modelPanel.none') }}</dd>
            </div>
          </dl>
        </template>
      </InspectorPanel>
    </template>
  </EntityWorkspace>

  <ModelSearchDialog v-model:visible="modelDialogVisible" kind="gameobject" @select="onModelSelect" />
</template>

<style scoped>
.type-filter-toggle {
  width: var(--input-height-sm);
  height: var(--input-height-sm);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-default);
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-muted);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
}

.type-filter-toggle:hover {
  color: var(--accent);
  border-color: var(--accent-focus);
  background: var(--accent-soft);
}

.type-filter-toggle.active {
  color: var(--accent);
  border-color: var(--accent-focus);
  background: var(--accent-soft);
}

.type-filter-select {
  width: 14rem;
}

.editor-loading {
  display: flex;
  justify-content: center;
  padding: 3rem 0;
  color: var(--accent);
  font-size: 1.5rem;
}

/* Model field: number input + "search a model" button on one row. */
.model-field {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.model-field :deep(.p-inputnumber) {
  flex: 1;
  min-width: 0;
}

.go-facts {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.go-facts-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.78rem;
}

.go-facts-row dt {
  color: var(--text-muted);
}

.go-facts-row dd {
  margin: 0;
  color: var(--text);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.qrel-empty {
  color: var(--text-muted);
  font-size: 0.875rem;
  padding: 0.75rem 0;
  text-align: center;
}

.qrel-row {
  display: grid;
  grid-template-columns: 6rem 1fr 2.5rem;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.5rem;
}

.qrel-tag {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 500;
}

.qrel-add-row {
  margin-top: 0.5rem;
}

.field-group-modified {
  border-color: var(--accent-focus);
}

.quest-rel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.quest-col-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--p-text-color);
  margin-bottom: 0.25rem;
}

.quest-col-desc {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  margin-bottom: 0.75rem;
}
</style>
