<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import EntityWorkspace from '@core/components/workspace/EntityWorkspace.vue'
import EntityListPanel from '@core/components/workspace/EntityListPanel.vue'
import InspectorPanel from '@core/components/workspace/InspectorPanel.vue'
import WorkspaceEmptyState from '@core/components/workspace/WorkspaceEmptyState.vue'
import EditorHeader from '@core/components/EditorHeader.vue'
import SectionTabs, { type SectionTabItem } from '@core/components/SectionTabs.vue'
import ModelViewer from '@/modules/model_viewer/components/ModelViewer.vue'
import Popover from 'primevue/popover'
import Select from 'primevue/select'
import type { CreatureTemplate } from '@/modules/npc/types/creature_template/creature_template'
import type { Creature } from '@/modules/npc/types/creature/creature'
import { type_options } from '@/modules/npc/types/defines'
import { getNpcs, getCreatureSpawns, saveCreatureSpawn, deleteCreatureSpawn } from '@/modules/npc/service'
import { useNpcModuleStore } from '@/modules/npc/store'
import CreatureEditor, { type SpawnInspectorState } from './CreatureEditor.vue'
import NpcTabGeneral from './editor/creature_template/GeneralTab.vue'
import NpcTabCombat from './editor/creature_template/CombatTab.vue'
import NpcTabAppearance from './editor/creature_template/AppearanceTab.vue'
import NpcTabLoot from './editor/creature_template/LootTab.vue'
import NpcTabAdvanced from './editor/creature_template/AdvancedTab.vue'
import NpcTabSpawn from './editor/creature_template/SpawnTab.vue'
import SmartScriptsPanel from '@/modules/smart_scripts/pages/SmartScriptsPanel.vue'
import { useSmartScriptsStore } from '@/modules/smart_scripts/stores/smartScriptsStore'
import NpcTabText from './editor/creature_template/TextTab.vue'
import EditorField from '@core/components/EditorField.vue'
import InputText from 'primevue/inputtext'
import { useNpcFieldModifiers } from '@/modules/npc/pages/useNpcFieldModifiers'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useNpcModuleStore()
const form = store.formData
const { isFieldModified } = useNpcFieldModifiers()

const typeMap: Record<number, string> = {
  0: 'None', 1: 'Beast', 2: 'Dragonkin', 3: 'Demon', 4: 'Elemental', 5: 'Giant',
  6: 'Undead', 7: 'Humanoid', 8: 'Critter', 9: 'Mechanical', 10: 'Not specified',
  11: 'Totem', 12: 'Non-combat Pet', 15: 'Gas Cloud',
}

function metaOf(npc: CreatureTemplate): string {
  const type = typeMap[npc.type] ?? `Type ${npc.type}`
  const level = npc.minlevel === npc.maxlevel ? `niv. ${npc.minlevel}` : `niv. ${npc.minlevel}–${npc.maxlevel}`
  return `#${npc.entry} · ${type} · ${level}`
}

/** undefined = no selection, null = create mode, number = edit. */
const entryParam = computed<number | null | undefined>(() => {
  const p = route.params.entry as string | undefined
  if (p === undefined || p === '') return undefined
  if (p === 'new') return null
  const n = Number(p)
  return Number.isNaN(n) ? undefined : n
})

const editorLoading = ref(false)

// --- Spawn state ---
const spawns = ref<Creature[]>([])
const spawnsLoading = ref(false)
const editingSpawnGuid = ref<number | null>(null)

// Filled by CreatureEditor so the right rail can show the spawn's SQL/diff.
const spawnInspector = reactive<SpawnInspectorState>({
  diffQuery: '',
  fullQuery: '',
  hasChanges: false,
  changedFields: [],
  modelid: 0,
})

async function loadSpawns(entry: number | null) {
  if (entry == null) {
    spawns.value = []
    return
  }
  spawnsLoading.value = true
  try {
    spawns.value = await getCreatureSpawns(entry)
  } catch (e) {
    console.error('Failed to load spawns:', e)
  } finally {
    spawnsLoading.value = false
  }
}

watch(entryParam, async (val) => {
  editingSpawnGuid.value = null
  if (val === undefined) {
    store.closeEditor()
    return
  }
  if (store.editorDataLoaded && store.editingEntry === val) {
    loadSpawns(val)
    return
  }
  editorLoading.value = true
  try {
    await store.openEditor(val)
  } catch (e) {
    console.error('Failed to load NPC:', e)
  } finally {
    editorLoading.value = false
  }
  loadSpawns(val)
}, { immediate: true })

// --- List ---
async function loadNpcs() {
  store.loading = true
  try {
    const result = await getNpcs(store.currentSearch || undefined, store.currentTypeFilter ?? undefined, 50)
    store.setNpcs(result.data)
    store.markListLoaded()
  } catch (e) {
    console.error('Failed to load NPCs:', e)
  } finally {
    store.loading = false
  }
}

async function onSearch(query: string) {
  store.currentSearch = query
  await loadNpcs()
}

// --- Type filter ---
const typeFilterOptions = type_options.map(o => ({ value: o.value, name: o.name }))
const typeFilterPopover = ref<InstanceType<typeof Popover> | null>(null)

const typeFilter = computed<number | null>({
  get: () => store.currentTypeFilter,
  set: (val) => { store.currentTypeFilter = val ?? null },
})

function onTypeFilterToggle(event: Event) {
  typeFilterPopover.value?.toggle(event)
}

watch(typeFilter, () => {
  loadNpcs()
})

function onSelect(npc: CreatureTemplate) {
  router.push(`/npc/creature-template/${npc.entry}`)
}

function onAdd() {
  router.push('/npc/creature-template/new')
}

async function onRemove(npc: CreatureTemplate) {
  try {
    await store.deleteCurrent(npc.entry)
    if (entryParam.value === npc.entry) {
      router.push('/npc/creature-template')
    }
    await loadNpcs()
  } catch (e) {
    console.error('Failed to delete NPC:', e)
  }
}

onMounted(() => {
  if (!store.listLoaded) {
    loadNpcs()
  }
})

// --- Editor actions ---
async function onSave() {
  try {
    const savedEntry = form.entry
    await store.saveCurrent()
    // The SmartAI tab edits smart_scripts through its own store: save it under
    // the same button so "execute" covers everything shown in this editor.
    if (saiHasChanges.value) {
      await saiStore.saveScript()
    }
    await loadNpcs()
    if (entryParam.value === null && savedEntry) {
      router.push(`/npc/creature-template/${savedEntry}`)
    }
  } catch (e) {
    console.error('Failed to save NPC:', e)
  }
}

function onDiscard() {
  store.discardChanges()
  if (saiHasChanges.value) {
    saiStore.discardChanges()
  }
}

// --- Spawn sub-editor ---
function onEditSpawn(spawn: Creature) {
  editingSpawnGuid.value = spawn.guid
}

async function onDeleteSpawn(spawn: Creature) {
  try {
    await deleteCreatureSpawn(spawn.guid)
    await loadSpawns(entryParam.value ?? null)
  } catch (e) {
    console.error('Failed to delete spawn:', e)
  }
}

function onCreatureEditorClose() {
  editingSpawnGuid.value = null
  loadSpawns(entryParam.value ?? null)
}

async function onCreatureEditorSave(data: Creature) {
  try {
    await saveCreatureSpawn(data)
    editingSpawnGuid.value = null
    await loadSpawns(entryParam.value ?? null)
  } catch (e) {
    console.error('Failed to save spawn:', e)
  }
}

// --- SmartAI tab (separate store, folded into this editor's save/discard) ---
const saiStore = useSmartScriptsStore()
const saiHasChanges = computed(() => Boolean(form.entry) && saiStore.hasChangesFor(form.entry, 0))
const editorHasChanges = computed(() => store.combinedHasChanges || saiHasChanges.value)

// Deep links from the SQL session panel land straight on the SmartAI tab.
const initialTab = computed(() => (route.query.tab === 'sai' ? 'sai' : 'general'))

// --- Tabs ---
const mainTabs = computed<SectionTabItem[]>(() => [
  { value: 'general', label: t('creature_template.tabs.general') },
  { value: 'combat', label: t('creature_template.tabs.combat') },
  { value: 'appearance', label: t('creature_template.tabs.appearance') },
  { value: 'loot', label: t('creature_template.tabs.loot') },
  { value: 'text', label: t('creature_template.tabs.text') },
  { value: 'advanced', label: t('creature_template.tabs.advanced') },
  { value: 'spawn', label: t('creature_template.tabs.spawn'), count: spawns.value.length },
  { value: 'sai', label: t('creature_template.tabs.sai') },
])
</script>

<template>
  <EntityWorkspace storageKey="npc.creatureTemplate">
    <template #list>
      <EntityListPanel
        :items="store.npcs"
        :idOf="(n: CreatureTemplate) => n.entry"
        :titleOf="(n: CreatureTemplate) => n.name"
        :metaOf="metaOf"
        :selectedId="entryParam ?? null"
        :modifiedIds="store.modifiedIds"
        :loading="store.loading"
        :searchPlaceholder="t('npc.searchPlaceholder')"
        removable
        @select="onSelect"
        @add="onAdd"
        @search="onSearch"
        @remove="onRemove"
      >
        <template #filters>
          <button
            type="button"
            class="type-filter-toggle"
            :class="{ active: typeFilter !== null }"
            v-tooltip.bottom="t('npc.filterByType')"
            @click="onTypeFilterToggle"
          >
            <i class="pi pi-filter"></i>
          </button>
          <Popover ref="typeFilterPopover">
            <Select
              v-model="typeFilter"
              :options="typeFilterOptions"
              optionLabel="name"
              optionValue="value"
              :placeholder="t('npc.filterByType')"
              showClear
              class="type-filter-select"
            />
          </Popover>
        </template>
      </EntityListPanel>
    </template>

    <template #editor>
      <!-- Spawn sub-editor replaces the template editor -->
      <CreatureEditor
        v-if="editingSpawnGuid != null"
        :spawnGuid="editingSpawnGuid"
        :npcEntry="form.entry"
        :inspector="spawnInspector"
        @close="onCreatureEditorClose"
        @save="onCreatureEditorSave"
      />

      <template v-else-if="entryParam !== undefined">
        <EditorHeader
          :subtitle="form.name || t('creature_template.editorTitle')"
          :id="form.entry"
          table="creature_template"
          :showBack="false"
          :hasChanges="editorHasChanges"
          :discardLabel="t('creature_template.discard')"
          :executeLabel="t('creature_template.execute')"
          @discard="onDiscard"
          @execute="onSave"
        />

        <div v-if="editorLoading" class="editor-loading">
          <i class="pi pi-spin pi-spinner"></i>
        </div>

        <SectionTabs v-else :tabs="mainTabs" variant="plain" :defaultValue="initialTab">
          <template #general><NpcTabGeneral /></template>
          <template #combat><NpcTabCombat /></template>
          <template #appearance><NpcTabAppearance /></template>
          <template #loot><NpcTabLoot /></template>
          <template #text><NpcTabText /></template>
          <template #advanced><NpcTabAdvanced /></template>
          <template #spawn>
            <NpcTabSpawn :spawns="spawns" @edit="onEditSpawn" @delete="onDeleteSpawn" />
          </template>
          <template #sai>
            <div class="field-group">
              <div class="field-group-header">
                <h4>{{ t('creature_template.groups.aiBehavior') }}</h4>
                <p>{{ t('creature_template.groups.aiBehaviorDesc') }}</p>
              </div>
              <div class="field-grid">
                <EditorField :label="t('creature_template.fields.AIName')" :modified="isFieldModified('AIName')">
                  <InputText v-model="form.AIName" fluid />
                </EditorField>
                <EditorField :label="t('creature_template.fields.ScriptName')" :modified="isFieldModified('ScriptName')">
                  <InputText v-model="form.ScriptName" fluid />
                </EditorField>
              </div>
            </div>
            <SmartScriptsPanel v-if="form.entry" :entryorguid="form.entry" :sourceType="0" />
          </template>
        </SectionTabs>
      </template>

      <WorkspaceEmptyState v-else />
    </template>

    <template #inspector>
      <!-- Spawn inspector (right rail) while editing a creature spawn -->
      <InspectorPanel
        v-if="editingSpawnGuid != null"
        :title="t('workspace.inspector')"
        :subtitle="`${t('creature.editorTitle')} #${editingSpawnGuid}`"
        storageKey="npc.spawn"
        :changedFields="spawnInspector.changedFields"
        :diffQuery="spawnInspector.diffQuery"
        :fullQuery="spawnInspector.fullQuery"
        :hasChanges="spawnInspector.hasChanges"
      >
        <template #preview>
          <ModelViewer kind="creature" :displayId="spawnInspector.modelid || form.modelid1" />
        </template>
      </InspectorPanel>

      <InspectorPanel
        v-else-if="entryParam !== undefined"
        :title="t('workspace.inspector')"
        :subtitle="form.name || undefined"
        storageKey="npc.creatureTemplate"
        :changedFields="store.combinedChangedFields"
        :diffQuery="store.combinedDiffQuery"
        :fullQuery="store.combinedFullQuery"
        :hasChanges="store.combinedHasChanges"
      >
        <template #preview>
          <ModelViewer kind="creature" :displayId="form.modelid1" />
        </template>
        <template #facts>
          <dl class="npc-facts">
            <div class="npc-facts-row">
              <dt>{{ t('creature_template.modelPanel.displayId') }}</dt>
              <dd>{{ form.modelid1 || t('creature_template.modelPanel.none') }}</dd>
            </div>
            <div class="npc-facts-row">
              <dt>{{ t('creature_template.modelPanel.scale') }}</dt>
              <dd>{{ form.scale ?? t('creature_template.modelPanel.none') }}</dd>
            </div>
            <div class="npc-facts-row">
              <dt>{{ t('creature_template.fields.faction') }}</dt>
              <dd>{{ form.faction ?? t('creature_template.modelPanel.none') }}</dd>
            </div>
            <div class="npc-facts-row">
              <dt>{{ t('creature_template.modelPanel.icon') }}</dt>
              <dd>{{ form.IconName || t('creature_template.modelPanel.none') }}</dd>
            </div>
          </dl>
        </template>
      </InspectorPanel>
    </template>
  </EntityWorkspace>
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

.npc-facts {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.npc-facts-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.78rem;
}

.npc-facts-row dt {
  color: var(--text-muted);
}

.npc-facts-row dd {
  margin: 0;
  color: var(--text);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
</style>
