<script setup lang="ts">
import { ref, computed, watch, onMounted, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import InputNumber from 'primevue/inputnumber'
import EntityWorkspace from '@core/components/workspace/EntityWorkspace.vue'
import EntityListPanel from '@core/components/workspace/EntityListPanel.vue'
import InspectorPanel from '@core/components/workspace/InspectorPanel.vue'
import WorkspaceEmptyState from '@core/components/workspace/WorkspaceEmptyState.vue'
import EditorHeader from '@core/components/EditorHeader.vue'
import EditorField from '@core/components/EditorField.vue'
import type { ExplorationBasexp } from '@/modules/exploration/types'
import { useExplorationBasexpStore, generateDiffQuery, generateFullQuery, getChangedFields } from '@/modules/exploration/store'
import { useTableFieldModifiers } from '@core/composables/useTableFieldModifiers'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useExplorationBasexpStore()
const { isFieldModified, changedFields } = useTableFieldModifiers(store, getChangedFields)

const form = store.formData
const originalValue = toRef(store, 'originalValue')
const loading = ref(false)

/** undefined = no selection, null = create mode, number = edit. */
const levelParam = computed<number | null | undefined>(() => {
  const param = route.params.level as string | undefined
  if (param === undefined || param === '') return undefined
  if (param === 'new') return null
  const n = Number(param)
  return Number.isNaN(n) ? undefined : n
})

const isNew = computed(() => levelParam.value === null)

watch(levelParam, async (val) => {
  if (val === undefined) return
  loading.value = true
  try {
    if (val === null) {
      store.openNew()
    } else {
      await store.openEditor(val)
    }
  } catch (e) {
    console.error('Failed to load exploration basexp:', e)
  } finally {
    loading.value = false
  }
}, { immediate: true })

// --- List ---
async function loadEntries() {
  await store.fetchEntries(store.currentSearch || undefined, 50)
}

async function onSearch(query: string) {
  store.currentSearch = query
  await loadEntries()
}

function onSelect(row: ExplorationBasexp) {
  router.push(`/exploration/${row.level}`)
}

function onAdd() {
  router.push('/exploration/new')
}

async function onRemove(row: ExplorationBasexp) {
  try {
    await store.deleteEntry(row.level)
    if (levelParam.value === row.level) {
      router.push('/exploration')
    }
  } catch (e) {
    console.error('Failed to delete exploration basexp:', e)
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
  if (hasChanges.value && levelParam.value != null) set.add(form.level)
  return set
})

async function onExecute() {
  try {
    const savedLevel = form.level
    await store.saveEntry()
    await loadEntries()
    if (isNew.value) {
      router.push(`/exploration/${savedLevel}`)
    }
  } catch (e) {
    console.error('Failed to save exploration basexp:', e)
  }
}

function onDiscard() {
  if (!isNew.value && originalValue.value) {
    Object.assign(form, originalValue.value)
  }
}
</script>

<template>
  <EntityWorkspace storageKey="exploration.basexp">
    <template #list>
      <EntityListPanel
        :items="store.entries"
        :idOf="(r: ExplorationBasexp) => r.level"
        :titleOf="(r: ExplorationBasexp) => `${t('exploration_basexp.fields.level')} ${r.level}`"
        :metaOf="(r: ExplorationBasexp) => `${r.basexp} XP`"
        :selectedId="levelParam ?? null"
        :modifiedIds="modifiedKeys"
        :loading="store.loading"
        :searchPlaceholder="t('exploration_basexp.searchPlaceholder')"
        removable
        @select="onSelect"
        @add="onAdd"
        @search="onSearch"
        @remove="onRemove"
      />
    </template>

    <template #editor>
      <template v-if="levelParam !== undefined">
        <EditorHeader
          :subtitle="t('exploration_basexp.editorTitle')"
          :id="isNew ? undefined : form.level"
          table="exploration_basexp"
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

        <div v-else class="field-group">
          <div class="field-group-header">
            <h4>{{ t('exploration_basexp.groups.main') }}</h4>
            <p>{{ t('exploration_basexp.groups.mainDesc') }}</p>
          </div>
          <div class="field-grid">
            <EditorField :label="t('exploration_basexp.fields.level')">
              <InputNumber v-model="form.level" :useGrouping="false" :min="0" :max="255" :disabled="!isNew" fluid />
            </EditorField>
            <EditorField :label="t('exploration_basexp.fields.basexp')" :modified="isFieldModified('basexp')">
              <InputNumber v-model="form.basexp" :useGrouping="false" :min="0" fluid />
            </EditorField>
          </div>
        </div>
      </template>

      <WorkspaceEmptyState v-else />
    </template>

    <template #inspector>
      <InspectorPanel
        v-if="levelParam !== undefined"
        :title="t('workspace.inspector')"
        :subtitle="`${t('exploration_basexp.fields.level')} ${form.level}`"
        storageKey="exploration.basexp"
        :changedFields="changedFields"
        :diffQuery="diffQuery"
        :fullQuery="fullQuery"
        :hasChanges="hasChanges"
      >
        <template #facts>
          <dl class="ws-facts">
            <div class="ws-facts-row">
              <dt>{{ t('exploration_basexp.fields.basexp') }}</dt>
              <dd>{{ form.basexp }}</dd>
            </div>
          </dl>
        </template>
      </InspectorPanel>
    </template>
  </EntityWorkspace>
</template>

<style scoped>
@import './editor/exploration-editor.css';

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
