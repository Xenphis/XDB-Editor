<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import EntityWorkspace from '@core/components/workspace/EntityWorkspace.vue'
import EntityListPanel from '@core/components/workspace/EntityListPanel.vue'
import InspectorPanel from '@core/components/workspace/InspectorPanel.vue'
import WorkspaceEmptyState from '@core/components/workspace/WorkspaceEmptyState.vue'
import EditorHeader from '@core/components/EditorHeader.vue'
import EditorField from '@core/components/EditorField.vue'
import SectionTabs, { type SectionTabItem } from '@core/components/SectionTabs.vue'
import EditableDataTable, { type ColumnDef } from '@core/components/EditableDataTable.vue'
import type { InstanceTemplate } from '@/modules/instances/types/instance_template'
import { useInstanceStore } from '@/modules/instances/stores/instance'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useInstanceStore()

const template = store.template
const loading = ref(false)

/** undefined = no selection, null = create mode, number = edit. */
const mapParam = computed<number | null | undefined>(() => {
  const param = route.params.map as string | undefined
  if (param === undefined || param === '') return undefined
  if (param === 'new') return null
  const n = Number(param)
  return Number.isNaN(n) ? undefined : n
})

const isNew = computed(() => mapParam.value === null)

async function loadEditor() {
  const val = mapParam.value
  if (val === undefined) return
  loading.value = true
  try {
    if (val === null) {
      store.openNew()
    } else {
      await store.openEditor(val)
    }
  } catch (e) {
    console.error('Failed to load instance:', e)
  } finally {
    loading.value = false
  }
}

watch(mapParam, loadEditor, { immediate: true })

// --- List ---
async function loadEntries() {
  await store.fetchEntries(store.currentSearch || undefined, 50)
}

async function onSearch(query: string) {
  store.currentSearch = query
  await loadEntries()
}

function onSelect(row: InstanceTemplate) {
  router.push(`/instances/instance-template/${row.map}`)
}

function onAdd() {
  router.push('/instances/instance-template/new')
}

async function onRemove(row: InstanceTemplate) {
  try {
    await store.deleteEntry(row.map)
    if (mapParam.value === row.map) {
      router.push('/instances/instance-template')
    }
  } catch (e) {
    console.error('Failed to delete instance:', e)
  }
}

onMounted(() => {
  if (!store.listLoaded) {
    loadEntries()
  }
})

// --- Editor ---
const diffQuery = computed(() => store.diffQueryText())
const hasChanges = computed(() => store.hasChanges())
const changedFields = computed(() => store.changedFields())

const modifiedKeys = computed<Set<string | number>>(() => {
  const set = new Set<string | number>()
  if (hasChanges.value && mapParam.value != null) set.add(template.map)
  return set
})

async function onExecute() {
  try {
    const savedMap = template.map
    await store.saveEntry()
    await loadEntries()
    if (isNew.value) {
      router.push(`/instances/instance-template/${savedMap}`)
    }
  } catch (e) {
    console.error('Failed to save instance:', e)
  }
}

function onDiscard() {
  loadEditor()
}

const spawnGroupColumns = computed<ColumnDef[]>(() => [
  { field: 'instanceMapId', header: t('instance_spawn_groups.fields.instanceMapId'), type: 'number', width: '9rem' },
  { field: 'bossStateId', header: t('instance_spawn_groups.fields.bossStateId'), type: 'number', width: '8rem' },
  { field: 'bossStates', header: t('instance_spawn_groups.fields.bossStates'), type: 'number', width: '8rem' },
  { field: 'spawnGroupId', header: t('instance_spawn_groups.fields.spawnGroupId'), type: 'number', width: '9rem' },
  { field: 'flags', header: t('instance_spawn_groups.fields.flags'), type: 'number', width: '7rem' },
])

const encounterColumns = computed<ColumnDef[]>(() => [
  { field: 'entry', header: t('instance_encounters.fields.entry'), type: 'number', width: '8rem' },
  { field: 'creditType', header: t('instance_encounters.fields.creditType'), type: 'number', width: '8rem' },
  { field: 'creditEntry', header: t('instance_encounters.fields.creditEntry'), type: 'number', width: '9rem' },
  { field: 'lastEncounterDungeon', header: t('instance_encounters.fields.lastEncounterDungeon'), type: 'number', width: '11rem' },
  { field: 'comment', header: t('instance_encounters.fields.comment'), type: 'text' },
])

const mainTabs = computed<SectionTabItem[]>(() => [
  { value: 'template', label: t('instance.tabs.template') },
  { value: 'spawnGroups', label: t('instance.tabs.spawnGroups'), count: store.spawnGroups.length },
  { value: 'encounters', label: t('instance.tabs.encounters'), count: store.encounters.length },
])
</script>

<template>
  <EntityWorkspace storageKey="instances.template">
    <template #list>
      <EntityListPanel
        :items="store.entries"
        :idOf="(r: InstanceTemplate) => r.map"
        :titleOf="(r: InstanceTemplate) => `Map ${r.map}`"
        :metaOf="(r: InstanceTemplate) => r.script || `parent ${r.parent}`"
        :selectedId="mapParam ?? null"
        :modifiedIds="modifiedKeys"
        :loading="store.loading"
        :searchPlaceholder="t('instance.searchPlaceholder')"
        removable
        @select="onSelect"
        @add="onAdd"
        @search="onSearch"
        @remove="onRemove"
      />
    </template>

    <template #editor>
      <template v-if="mapParam !== undefined">
        <EditorHeader
          :subtitle="isNew ? t('instance.editorTitle') : `Map ${template.map}`"
          table="instance_template"
          :showBack="false"
          :hasChanges="hasChanges || isNew"
          :discardLabel="t('editor.discard', 'Annuler')"
          :executeLabel="t('editor.execute', 'Exécuter')"
          @discard="onDiscard"
          @execute="onExecute"
        />

        <div v-if="loading" class="editor-loading">
          <i class="pi pi-spin pi-spinner"></i>
        </div>

        <SectionTabs v-else :tabs="mainTabs" variant="plain" defaultValue="template">
          <!-- ==================== TEMPLATE ==================== -->
          <template #template>
            <div class="field-group">
              <div class="field-group-header">
                <h4>{{ t('instance_template.groups.main') }}</h4>
                <p>{{ t('instance_template.groups.mainDesc') }}</p>
              </div>
              <div class="field-grid">
                <EditorField :label="t('instance_template.fields.map')">
                  <InputNumber v-model="template.map" :useGrouping="false" :min="0" :disabled="!isNew" fluid />
                </EditorField>
                <EditorField :label="t('instance_template.fields.parent')">
                  <InputNumber v-model="template.parent" :useGrouping="false" :min="0" fluid />
                </EditorField>
                <EditorField :label="t('instance_template.fields.allowMount')">
                  <InputNumber v-model="template.allowMount" :useGrouping="false" :min="0" :max="1" fluid />
                </EditorField>
                <EditorField :label="t('instance_template.fields.script')" :fullWidth="true">
                  <InputText v-model="template.script" fluid />
                </EditorField>
              </div>
            </div>
          </template>

          <!-- ==================== SPAWN GROUPS ==================== -->
          <template #spawnGroups>
            <div class="field-group">
              <div class="field-group-header">
                <h4>{{ t('instance.groups.spawnGroups') }}</h4>
                <p>{{ t('instance.groups.spawnGroupsDesc') }}</p>
              </div>
              <EditableDataTable
                :entries="store.spawnGroups"
                :columns="spawnGroupColumns"
                dataKey="_uid"
                :addLabel="t('instance.addSpawnGroup')"
                embedded
                @add="store.addSpawnGroup()"
                @remove="store.removeSpawnGroup($event)"
              />
            </div>
          </template>

          <!-- ==================== ENCOUNTERS ==================== -->
          <template #encounters>
            <div class="field-group">
              <div class="field-group-header">
                <h4>{{ t('instance.groups.encounters') }}</h4>
                <p>{{ t('instance.groups.encountersDesc') }}</p>
              </div>
              <div class="encounters-hint">
                <i class="pi pi-info-circle" />
                <span>{{ t('instance.encountersHint') }}</span>
              </div>
              <EditableDataTable
                :entries="store.encounters"
                :columns="encounterColumns"
                dataKey="_uid"
                :addLabel="t('instance.addEncounter')"
                embedded
                @add="store.addEncounter()"
                @remove="store.removeEncounter($event)"
              />
            </div>
          </template>
        </SectionTabs>
      </template>

      <WorkspaceEmptyState v-else />
    </template>

    <template #inspector>
      <InspectorPanel
        v-if="mapParam !== undefined"
        :title="t('workspace.inspector')"
        :subtitle="`Map ${template.map}`"
        storageKey="instances.template"
        :changedFields="changedFields"
        :diffQuery="diffQuery"
        :fullQuery="diffQuery"
        :hasChanges="hasChanges"
      >
        <template #facts>
          <dl class="ws-facts">
            <div class="ws-facts-row">
              <dt>{{ t('instance_template.fields.parent') }}</dt>
              <dd>{{ template.parent }}</dd>
            </div>
            <div class="ws-facts-row">
              <dt>{{ t('instance_template.fields.script') }}</dt>
              <dd>{{ template.script || '—' }}</dd>
            </div>
          </dl>
        </template>
      </InspectorPanel>
    </template>
  </EntityWorkspace>
</template>

<style scoped>
@import './editor/instances-editor.css';

.editor-loading {
  display: flex;
  justify-content: center;
  padding: 3rem 0;
  color: var(--accent);
  font-size: 1.5rem;
}

.encounters-hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-muted);
  background: var(--accent-soft);
  border: 1px solid var(--accent-ring);
  border-radius: var(--radius);
  padding: 0.625rem 0.875rem;
  margin-bottom: 1rem;
}

.encounters-hint .pi {
  color: var(--accent);
  font-size: 0.9rem;
}

.ws-facts {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.ws-facts-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.78rem;
}

.ws-facts-row dt {
  color: var(--text-muted);
}

.ws-facts-row dd {
  margin: 0;
  color: var(--text);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
</style>
