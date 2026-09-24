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
import { getQuests, type QuestZoneFilter } from '@/modules/quests/service'
import { loadZoneWorldBounds } from '@/modules/map_editor/service'
import { ZONE_BY_ID } from '@/modules/map_editor/data/zones'
import QuestZoneSelect from '../components/QuestZoneSelect.vue'
import QuestChainFilter from '../components/QuestChainFilter.vue'
import QuestChainView from '../components/QuestChainView.vue'
import QuestPreview from '../components/QuestPreview.vue'
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

/** Chain start whose graph is shown (`?chain=`); kept while editing one of
 * its quests so the header can lead back to the graph. */
const chainRoot = computed<number | null>(() => {
  const n = Number(route.query.chain)
  return route.query.chain != null && Number.isInteger(n) ? n : null
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
/** Giver-zone scope of the list; the zone's world rectangle comes from the
 * client's WorldMapArea.dbc, so without a client the zone falls back to its
 * whole map. */
async function zoneFilter(): Promise<QuestZoneFilter | null> {
  const zone = ZONE_BY_ID.get(store.zoneId)
  if (!zone) return null
  let bounds = null
  if (zone.zoneId != null) {
    try {
      bounds = await loadZoneWorldBounds(zone.zoneId)
    } catch {
      bounds = null
    }
  }
  return { map: zone.map, bounds }
}

async function loadQuests() {
  store.loading = true
  try {
    const result = await getQuests(store.currentSearch || undefined, 50, undefined, await zoneFilter(), store.chainFilter)
    store.setQuests(result.data)
    store.markListLoaded()
  } catch (e) {
    console.error('Failed to load quests:', e)
  } finally {
    store.loading = false
  }
}

async function onZoneChange(id: string) {
  store.zoneId = id
  await loadQuests()
}

async function onChainChange(value: 'start' | 'single' | null) {
  store.chainFilter = value
  await loadQuests()
}

async function onSearch(query: string) {
  store.currentSearch = query
  await loadQuests()
}

function onSelect(quest: QuestTemplate) {
  // In the chain-starters list a click opens the chain graph; the field
  // editor is one click further, on a node.
  if (store.chainFilter === 'start') {
    router.push({ path: '/quests', query: { chain: quest.ID } })
  } else {
    router.push(`/quests/${quest.ID}`)
  }
}

function onOpenChainQuest(id: number) {
  router.push({ path: `/quests/${id}`, query: { chain: chainRoot.value } })
}

function onBackToChain() {
  router.push({ path: '/quests', query: { chain: chainRoot.value } })
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
      <QuestZoneSelect :modelValue="store.zoneId" @update:modelValue="onZoneChange" />
      <EntityListPanel
        :items="store.quests"
        :idOf="(q: QuestTemplate) => q.ID"
        :titleOf="(q: QuestTemplate) => q.LogTitle || `#${q.ID}`"
        :metaOf="metaOf"
        :selectedId="idParam ?? chainRoot"
        :modifiedIds="store.modifiedIds"
        :loading="store.loading"
        :searchPlaceholder="t('quest.searchPlaceholder')"
        removable
        @select="onSelect"
        @add="onAdd"
        @search="onSearch"
        @remove="onRemove"
      >
        <template #filters>
          <QuestChainFilter :modelValue="store.chainFilter" @update:modelValue="onChainChange" />
        </template>
      </EntityListPanel>
    </template>

    <template #editor>
      <template v-if="idParam !== undefined">
        <EditorHeader
          :subtitle="form.LogTitle || t('quest_template.editorTitle')"
          :id="form.ID"
          table="quest_template"
          :showBack="chainRoot !== null"
          :backLabel="t('quest.chainView.back')"
          :hasChanges="store.combinedHasChanges"
          :discardLabel="t('quest_template.discard')"
          :executeLabel="t('quest_template.execute')"
          @back="onBackToChain"
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

      <QuestChainView
        v-else-if="chainRoot !== null"
        :rootId="chainRoot"
        :modifiedIds="store.modifiedIds"
        @open="onOpenChainQuest"
      />

      <WorkspaceEmptyState v-else />
    </template>

    <template #inspector>
      <InspectorPanel
        v-if="idParam !== undefined"
        :title="t('workspace.inspector')"
        :subtitle="form.LogTitle || undefined"
        storageKey="quests"
        width="340px"
        :changedFields="store.combinedChangedFields"
        :diffQuery="store.combinedDiffQuery"
        :fullQuery="store.combinedFullQuery"
        :hasChanges="store.combinedHasChanges"
      >
        <template #preview>
          <QuestPreview />
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

</style>
