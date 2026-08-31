<script setup lang="ts">
import { ref, computed, watch, onMounted, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import EntityWorkspace from '@core/components/workspace/EntityWorkspace.vue'
import EntityListPanel from '@core/components/workspace/EntityListPanel.vue'
import InspectorPanel from '@core/components/workspace/InspectorPanel.vue'
import WorkspaceEmptyState from '@core/components/workspace/WorkspaceEmptyState.vue'
import EditorHeader from '@core/components/EditorHeader.vue'
import EditorField from '@core/components/EditorField.vue'
import type { AccessRequirement } from '@/modules/instances/types/access_requirement'
import { useAccessRequirementStore, generateDiffQuery, generateFullQuery, getChangedFields } from '@/modules/instances/store'
import { useTableFieldModifiers } from '@core/composables/useTableFieldModifiers'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useAccessRequirementStore()
const { isFieldModified, changedFields } = useTableFieldModifiers(store, getChangedFields)

const form = store.formData
const originalValue = toRef(store, 'originalValue')
const loading = ref(false)

/** undefined = no selection, null = create mode, {mapId, difficulty} = edit. */
const selection = computed<{ mapId: number; difficulty: number } | null | undefined>(() => {
  const mapId = route.params.mapId as string | undefined
  if (mapId === undefined || mapId === '') return undefined
  if (mapId === 'new') return null
  const difficulty = Number(route.params.difficulty)
  const id = Number(mapId)
  if (!Number.isFinite(id) || !Number.isFinite(difficulty)) return undefined
  return { mapId: id, difficulty }
})

const isNew = computed(() => selection.value === null)
const selectedKey = computed(() =>
  selection.value ? `${selection.value.mapId}:${selection.value.difficulty}` : null,
)

function keyOf(row: AccessRequirement): string {
  return `${row.mapId}:${row.difficulty}`
}

watch(selection, async (val) => {
  if (val === undefined) return
  loading.value = true
  try {
    if (val === null) {
      store.openNew()
    } else {
      await store.openEditor(val.mapId, val.difficulty)
    }
  } catch (e) {
    console.error('Failed to load access requirement:', e)
  } finally {
    loading.value = false
  }
}, { immediate: true })

const difficultyOptions = [
  { value: 0, label: t('access_requirement.difficulty.0') },
  { value: 1, label: t('access_requirement.difficulty.1') },
  { value: 2, label: t('access_requirement.difficulty.2') },
  { value: 3, label: t('access_requirement.difficulty.3') },
  { value: 4, label: t('access_requirement.difficulty.4') },
  { value: 5, label: t('access_requirement.difficulty.5') },
]

function difficultyLabel(difficulty: number): string {
  return difficultyOptions.find(d => d.value === difficulty)?.label ?? `Difficulty ${difficulty}`
}

// --- List ---
async function loadEntries() {
  await store.fetchEntries(store.currentSearch || undefined, 50)
}

async function onSearch(query: string) {
  store.currentSearch = query
  await loadEntries()
}

function onSelect(row: AccessRequirement) {
  router.push(`/instances/access-requirement/${row.mapId}/${row.difficulty}`)
}

function onAdd() {
  router.push('/instances/access-requirement/new')
}

async function onRemove(row: AccessRequirement) {
  try {
    await store.deleteEntry(row.mapId, row.difficulty)
    if (selectedKey.value === keyOf(row)) {
      router.push('/instances/access-requirement')
    }
  } catch (e) {
    console.error('Failed to delete access requirement:', e)
  }
}

onMounted(() => {
  if (!store.listLoaded) {
    loadEntries()
  }
})

// --- Editor ---
const diffQuery = computed(() => {
  if (!originalValue.value) return ''
  return generateDiffQuery(originalValue.value, form)
})

const fullQuery = computed(() => generateFullQuery(form))
const hasChanges = computed(() => changedFields.value.length > 0)

const modifiedKeys = computed<Set<string | number>>(() => {
  const set = new Set<string | number>()
  if (hasChanges.value && selection.value) set.add(`${form.mapId}:${form.difficulty}`)
  return set
})

async function onExecute() {
  try {
    const savedMapId = form.mapId
    const savedDifficulty = form.difficulty
    await store.saveEntry()
    await loadEntries()
    if (isNew.value) {
      router.push(`/instances/access-requirement/${savedMapId}/${savedDifficulty}`)
    }
  } catch (e) {
    console.error('Failed to save access requirement:', e)
  }
}

function onDiscard() {
  if (!isNew.value && originalValue.value) {
    Object.assign(form, originalValue.value)
  }
}
</script>

<template>
  <EntityWorkspace storageKey="instances.accessRequirement">
    <template #list>
      <EntityListPanel
        :items="store.entries"
        :idOf="keyOf"
        :titleOf="(r: AccessRequirement) => `Map ${r.mapId} — ${difficultyLabel(r.difficulty)}`"
        :metaOf="(r: AccessRequirement) => r.comment || `niv. ${r.level_min || '—'}–${r.level_max || '—'}`"
        :selectedId="selectedKey"
        :modifiedIds="modifiedKeys"
        :loading="store.loading"
        :searchPlaceholder="t('access_requirement.searchPlaceholder')"
        removable
        @select="onSelect"
        @add="onAdd"
        @search="onSearch"
        @remove="onRemove"
      />
    </template>

    <template #editor>
      <template v-if="selection !== undefined">
        <EditorHeader
          :subtitle="isNew ? t('access_requirement.editorTitle') : `Map ${form.mapId} — ${difficultyLabel(form.difficulty)}`"
          table="access_requirement"
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

        <template v-else>
          <!-- Identification -->
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('access_requirement.groups.identification') }}</h4>
              <p>{{ t('access_requirement.groups.identificationDesc') }}</p>
            </div>
            <div class="field-grid">
              <EditorField :label="t('access_requirement.fields.mapId')">
                <InputNumber v-model="form.mapId" :useGrouping="false" :disabled="!isNew" fluid />
              </EditorField>
              <EditorField :label="t('access_requirement.fields.difficulty')">
                <Select
                  v-model="form.difficulty"
                  :options="difficultyOptions"
                  optionLabel="label"
                  optionValue="value"
                  :disabled="!isNew"
                  fluid
                />
              </EditorField>
              <EditorField :label="t('access_requirement.fields.comment')" :modified="isFieldModified('comment')" :fullWidth="true">
                <InputText v-model="form.comment" fluid />
              </EditorField>
            </div>
          </div>

          <!-- Levels -->
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('access_requirement.groups.levels') }}</h4>
              <p>{{ t('access_requirement.groups.levelsDesc') }}</p>
            </div>
            <div class="field-grid">
              <EditorField :label="t('access_requirement.fields.level_min')" :modified="isFieldModified('level_min')">
                <InputNumber v-model="form.level_min" :useGrouping="false" :min="0" :max="80" fluid />
              </EditorField>
              <EditorField :label="t('access_requirement.fields.level_max')" :modified="isFieldModified('level_max')">
                <InputNumber v-model="form.level_max" :useGrouping="false" :min="0" :max="80" fluid />
              </EditorField>
              <EditorField :label="t('access_requirement.fields.item_level')" :modified="isFieldModified('item_level')">
                <InputNumber v-model="form.item_level" :useGrouping="false" :min="0" fluid />
              </EditorField>
            </div>
          </div>

          <!-- Items -->
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('access_requirement.groups.items') }}</h4>
              <p>{{ t('access_requirement.groups.itemsDesc') }}</p>
            </div>
            <div class="field-grid">
              <EditorField :label="t('access_requirement.fields.item')" :modified="isFieldModified('item')">
                <InputNumber v-model="form.item" :useGrouping="false" :min="0" fluid />
              </EditorField>
              <EditorField :label="t('access_requirement.fields.item2')" :modified="isFieldModified('item2')">
                <InputNumber v-model="form.item2" :useGrouping="false" :min="0" fluid />
              </EditorField>
            </div>
          </div>

          <!-- Quests & Achievements -->
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('access_requirement.groups.quests') }}</h4>
              <p>{{ t('access_requirement.groups.questsDesc') }}</p>
            </div>
            <div class="field-grid">
              <EditorField :label="t('access_requirement.fields.quest_done_A')" :modified="isFieldModified('quest_done_A')">
                <InputNumber v-model="form.quest_done_A" :useGrouping="false" :min="0" fluid />
              </EditorField>
              <EditorField :label="t('access_requirement.fields.quest_done_H')" :modified="isFieldModified('quest_done_H')">
                <InputNumber v-model="form.quest_done_H" :useGrouping="false" :min="0" fluid />
              </EditorField>
              <EditorField :label="t('access_requirement.fields.completed_achievement')" :modified="isFieldModified('completed_achievement')">
                <InputNumber v-model="form.completed_achievement" :useGrouping="false" :min="0" fluid />
              </EditorField>
              <EditorField :label="t('access_requirement.fields.quest_failed_text')" :modified="isFieldModified('quest_failed_text')" :fullWidth="true">
                <InputText v-model="form.quest_failed_text" fluid />
              </EditorField>
            </div>
          </div>
        </template>
      </template>

      <WorkspaceEmptyState v-else />
    </template>

    <template #inspector>
      <InspectorPanel
        v-if="selection !== undefined"
        :title="t('workspace.inspector')"
        :subtitle="`Map ${form.mapId} — ${difficultyLabel(form.difficulty)}`"
        storageKey="instances.accessRequirement"
        :changedFields="changedFields"
        :diffQuery="diffQuery"
        :fullQuery="fullQuery"
        :hasChanges="hasChanges"
      >
        <template #facts>
          <dl class="ws-facts">
            <div class="ws-facts-row">
              <dt>{{ t('access_requirement.fields.level_min') }}</dt>
              <dd>{{ form.level_min || '—' }}</dd>
            </div>
            <div class="ws-facts-row">
              <dt>{{ t('access_requirement.fields.level_max') }}</dt>
              <dd>{{ form.level_max || '—' }}</dd>
            </div>
            <div class="ws-facts-row">
              <dt>{{ t('access_requirement.fields.item_level') }}</dt>
              <dd>{{ form.item_level || '—' }}</dd>
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
