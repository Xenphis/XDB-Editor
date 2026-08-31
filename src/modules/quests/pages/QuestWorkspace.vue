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
import type { QuestTemplate } from '@/modules/quests/types/quest_template'
import { getQuests } from '@/modules/quests/service'
import { useQuestModuleStore } from '@/modules/quests/store'
import QuestTabGeneral from './editor/quest_template/GeneralTab.vue'
import QuestTabObjectives from './editor/quest_template/ObjectivesTab.vue'
import QuestTabRewards from './editor/quest_template/RewardsTab.vue'
import QuestTabChain from './editor/quest_template/ChainTab.vue'
import QuestTabLocale from './editor/quest_template/LocaleTab.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useQuestModuleStore()
const form = store.formData

const questTypeMap: Record<number, string> = {
  0: 'Auto-complete',
  1: 'Disabled',
  2: 'Normal',
  3: 'World Quest',
}

function typeLabel(type: number): string {
  return questTypeMap[type] ?? `Type ${type}`
}

function metaOf(quest: QuestTemplate): string {
  const level = quest.QuestLevel === -1 ? 'Scaling' : `niv. ${quest.QuestLevel}`
  return `#${quest.ID} · ${typeLabel(quest.QuestType)} · ${level}`
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
    console.error('Failed to load quest:', e)
  } finally {
    loading.value = false
  }
}, { immediate: true })

// --- List ---
async function loadQuests() {
  store.loading = true
  try {
    const result = await getQuests(store.currentSearch || undefined, 50)
    store.setQuests(result.data)
    store.markListLoaded()
  } catch (e) {
    console.error('Failed to load quests:', e)
  } finally {
    store.loading = false
  }
}

async function onSearch(query: string) {
  store.currentSearch = query
  await loadQuests()
}

function onSelect(quest: QuestTemplate) {
  router.push(`/quests/${quest.ID}`)
}

function onAdd() {
  router.push('/quests/new')
}

async function onRemove(quest: QuestTemplate) {
  try {
    await store.deleteCurrent(quest.ID)
    if (idParam.value === quest.ID) {
      router.push('/quests')
    }
    await loadQuests()
  } catch (e) {
    console.error('Failed to delete quest:', e)
  }
}

onMounted(() => {
  if (!store.listLoaded) {
    loadQuests()
  }
})

// --- Editor actions ---
async function onSave() {
  try {
    const savedId = form.ID
    await store.saveCurrent()
    await loadQuests()
    if (idParam.value === null && savedId) {
      router.push(`/quests/${savedId}`)
    }
  } catch (e) {
    console.error('Failed to save quest:', e)
  }
}

function onDiscard() {
  store.discardChanges()
}

// --- Tabs ---
const mainTabs = computed<SectionTabItem[]>(() => [
  { value: 'general', label: t('quest_template.tabs.general') },
  { value: 'objectives', label: t('quest_template.tabs.objectives') },
  { value: 'rewards', label: t('quest_template.tabs.rewards') },
  { value: 'chain', label: t('quest_template.tabs.chain') },
  { value: 'locale', label: t('quest_template.tabs.locale') },
])
</script>

<template>
  <EntityWorkspace storageKey="quests">
    <template #list>
      <EntityListPanel
        :items="store.quests"
        :idOf="(q: QuestTemplate) => q.ID"
        :titleOf="(q: QuestTemplate) => q.LogTitle || `#${q.ID}`"
        :metaOf="metaOf"
        :selectedId="idParam ?? null"
        :modifiedIds="store.modifiedIds"
        :loading="store.loading"
        :searchPlaceholder="t('quest.searchPlaceholder')"
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
          :subtitle="form.LogTitle || t('quest_template.editorTitle')"
          :id="form.ID"
          table="quest_template"
          :showBack="false"
          :hasChanges="store.combinedHasChanges"
          :discardLabel="t('quest_template.discard')"
          :executeLabel="t('quest_template.execute')"
          @discard="onDiscard"
          @execute="onSave"
        />

        <div v-if="loading" class="editor-loading">
          <i class="pi pi-spin pi-spinner"></i>
        </div>

        <SectionTabs v-else :tabs="mainTabs" variant="plain" defaultValue="general">
          <template #general><QuestTabGeneral /></template>
          <template #objectives><QuestTabObjectives /></template>
          <template #rewards><QuestTabRewards /></template>
          <template #chain><QuestTabChain /></template>
          <template #locale><QuestTabLocale /></template>
        </SectionTabs>
      </template>

      <WorkspaceEmptyState v-else />
    </template>

    <template #inspector>
      <InspectorPanel
        v-if="idParam !== undefined"
        :title="t('workspace.inspector')"
        :subtitle="form.LogTitle || undefined"
        storageKey="quests"
        :changedFields="store.combinedChangedFields"
        :diffQuery="store.combinedDiffQuery"
        :fullQuery="store.combinedFullQuery"
        :hasChanges="store.combinedHasChanges"
      >
        <template #facts>
          <dl class="quest-facts">
            <div class="quest-facts-row">
              <dt>{{ t('quest.columns.level') }}</dt>
              <dd>{{ form.QuestLevel === -1 ? 'Scaling' : form.QuestLevel }}</dd>
            </div>
            <div class="quest-facts-row">
              <dt>{{ t('quest.columns.type') }}</dt>
              <dd>{{ typeLabel(form.QuestType) }}</dd>
            </div>
            <div class="quest-facts-row">
              <dt>MinLevel</dt>
              <dd>{{ form.MinLevel ?? '—' }}</dd>
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

.quest-facts {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.quest-facts-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.78rem;
}

.quest-facts-row dt {
  color: var(--text-muted);
}

.quest-facts-row dd {
  margin: 0;
  color: var(--text);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
</style>
