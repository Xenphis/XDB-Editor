<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import EntityWorkspace from '@core/components/workspace/EntityWorkspace.vue'
import EntityListPanel from '@core/components/workspace/EntityListPanel.vue'
import InspectorPanel from '@core/components/workspace/InspectorPanel.vue'
import WorkspaceEmptyState from '@core/components/workspace/WorkspaceEmptyState.vue'
import EditorHeader from '@core/components/EditorHeader.vue'
import SectionTabs, { type SectionTabItem } from '@core/components/SectionTabs.vue'
import type { Trainer } from '@/modules/npc/types/trainer/trainer'
import { getTrainers, deleteTrainer } from '@/modules/npc/service'
import { useTrainerStore } from '@/modules/npc/stores/trainerStore'
import TrainerGeneralTab from './editor/trainer/GeneralTab.vue'
import TrainerSpellsTab from './editor/trainer/SpellsTab.vue'
import TrainerCreatureTab from './editor/trainer/CreatureTab.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useTrainerStore()
const form = store.formData

const typeMap: Record<number, string> = {
  0: 'Class',
  1: 'Mount',
  2: 'Tradeskill',
  3: 'Pet',
}

function typeLabel(type: number): string {
  return typeMap[type] ?? `Type ${type}`
}

function metaOf(trainer: Trainer): string {
  return `${typeLabel(trainer.Type)} · req. ${trainer.Requirement}`
}

/** undefined = no selection, null = create mode, number = edit. */
const idParam = computed<number | null | undefined>(() => {
  const param = route.params.id as string | undefined
  if (param === undefined || param === '') return undefined
  if (param === 'new') return null
  const n = Number(param)
  return Number.isNaN(n) ? undefined : n
})

const loading = ref(false)

watch(idParam, async (val) => {
  if (val === undefined) {
    store.closeEditor()
    return
  }
  if (store.editorDataLoaded && store.editingId === val) return
  loading.value = true
  try {
    await store.openEditor(val)
  } catch (e) {
    console.error('Failed to load trainer:', e)
  } finally {
    loading.value = false
  }
}, { immediate: true })

// --- List (client-side filter: getTrainers has no server search) ---
const searchQuery = ref('')

const filteredTrainers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return store.trainers
  const n = Number(q)
  return store.trainers.filter(tr =>
    (!isNaN(n) && tr.Id === n) ||
    typeLabel(tr.Type).toLowerCase().includes(q) ||
    (tr.Greeting ?? '').toLowerCase().includes(q)
  )
})

async function loadTrainers() {
  store.loading = true
  try {
    const data = await getTrainers()
    store.setTrainers(data)
    store.markListLoaded()
  } catch (e) {
    console.error('Failed to load trainers:', e)
  } finally {
    store.loading = false
  }
}

function onSearch(query: string) {
  searchQuery.value = query
}

function onSelect(trainer: Trainer) {
  router.push(`/npc/trainer/${trainer.Id}`)
}

function onAdd() {
  router.push('/npc/trainer/new')
}

async function onRemove(trainer: Trainer) {
  try {
    await deleteTrainer(trainer.Id)
    if (idParam.value === trainer.Id) {
      router.push('/npc/trainer')
    }
    await loadTrainers()
  } catch (e) {
    console.error('Failed to delete trainer:', e)
  }
}

onMounted(() => {
  if (!store.listLoaded) {
    loadTrainers()
  }
})

// --- Editor actions ---
async function onExecute() {
  try {
    const savedId = form.Id
    await store.saveCurrent()
    await loadTrainers()
    if (idParam.value === null && savedId) {
      router.push(`/npc/trainer/${savedId}`)
    }
  } catch (e) {
    console.error('Failed to save trainer:', e)
  }
}

function onDiscard() {
  store.discardChanges()
}

// --- Tabs ---
const mainTabs = computed<SectionTabItem[]>(() => [
  { value: 'general', label: t('trainer.tabs.general') },
  { value: 'spells', label: t('trainer.tabs.spells') },
  { value: 'creature', label: t('trainer.tabs.creature') },
])
</script>

<template>
  <EntityWorkspace storageKey="npc.trainer">
    <template #list>
      <EntityListPanel
        :items="filteredTrainers"
        :idOf="(tr: Trainer) => tr.Id"
        :titleOf="(tr: Trainer) => `#${tr.Id} ${typeLabel(tr.Type)}`"
        :metaOf="metaOf"
        :selectedId="idParam ?? null"
        :modifiedIds="store.modifiedIds"
        :loading="store.loading"
        :searchPlaceholder="t('trainer.searchPlaceholder')"
        removable
        @select="onSelect"
        @add="onAdd"
        @search="onSearch"
        @remove="onRemove"
      />
    </template>

    <template #editor>
      <template v-if="idParam !== undefined">
        <EditorHeader
          :subtitle="t('trainer.editorTitle')"
          :id="form.Id"
          table="trainer"
          :showBack="false"
          :hasChanges="store.combinedHasChanges"
          :discardLabel="t('trainer.discard')"
          :executeLabel="t('trainer.execute')"
          @discard="onDiscard"
          @execute="onExecute"
        />

        <div v-if="loading" class="editor-loading">
          <i class="pi pi-spin pi-spinner"></i>
        </div>

        <SectionTabs v-else :tabs="mainTabs" variant="plain" defaultValue="general">
          <template #general><TrainerGeneralTab /></template>
          <template #spells><TrainerSpellsTab /></template>
          <template #creature><TrainerCreatureTab /></template>
        </SectionTabs>
      </template>

      <WorkspaceEmptyState v-else />
    </template>

    <template #inspector>
      <InspectorPanel
        v-if="idParam !== undefined"
        :title="t('workspace.inspector')"
        :subtitle="form.Greeting ?? undefined"
        storageKey="npc.trainer"
        :changedFields="store.combinedChangedFields"
        :diffQuery="store.combinedDiffQuery"
        :fullQuery="store.combinedFullQuery"
        :hasChanges="store.combinedHasChanges"
      >
        <template #facts>
          <dl class="trainer-facts">
            <div class="trainer-facts-row">
              <dt>{{ t('trainer.columns.type') }}</dt>
              <dd>{{ typeLabel(form.Type) }}</dd>
            </div>
            <div class="trainer-facts-row">
              <dt>{{ t('trainer.columns.requirement') }}</dt>
              <dd>{{ form.Requirement ?? '—' }}</dd>
            </div>
          </dl>
        </template>
      </InspectorPanel>
    </template>
  </EntityWorkspace>
</template>

<style scoped>
.editor-loading {
  display: flex;
  justify-content: center;
  padding: 3rem 0;
  color: var(--accent);
  font-size: 1.5rem;
}

.trainer-facts {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.trainer-facts-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.78rem;
}

.trainer-facts-row dt {
  color: var(--text-muted);
}

.trainer-facts-row dd {
  margin: 0;
  color: var(--text);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
</style>
