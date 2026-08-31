<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import EntityWorkspace from '@core/components/workspace/EntityWorkspace.vue'
import EntityListPanel from '@core/components/workspace/EntityListPanel.vue'
import InspectorPanel from '@core/components/workspace/InspectorPanel.vue'
import WorkspaceEmptyState from '@core/components/workspace/WorkspaceEmptyState.vue'
import EditorHeader from '@core/components/EditorHeader.vue'
import type { SmartScriptOwner } from '../service'
import { getSmartScriptOwnerInfo } from '../service'
import { decodeScriptKey, encodeScriptKey } from '../stores/scriptSet'
import { useSmartScriptsStore } from '../stores/smartScriptsStore'
import SmartScriptsPanel from './SmartScriptsPanel.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useSmartScriptsStore()
const form = store.formData

const sourceTypeLabels: Record<number, string> = {
  0: 'Creature',
  1: 'GameObject',
  2: 'Areatrigger',
  9: 'Actionlist',
}

/** undefined = no selection, otherwise the encoded (entryorguid, source_type) key. */
const keyParam = computed<number | undefined>(() => {
  if (route.params.sourceType === undefined || route.params.entry === undefined) return undefined
  const sourceType = Number(route.params.sourceType as string)
  const entry = Number(route.params.entry as string)
  if (Number.isNaN(sourceType) || Number.isNaN(entry)) return undefined
  return encodeScriptKey(entry, sourceType)
})

const selection = computed(() =>
  keyParam.value === undefined ? null : decodeScriptKey(keyParam.value),
)

const panel = ref<InstanceType<typeof SmartScriptsPanel> | null>(null)

watch(keyParam, (key) => {
  // The panel loads the script itself; closing is the workspace's job.
  if (key === undefined) store.closeEditor()
})

// --- Owner list ---
function onSearch(query: string) {
  store.loadOwners(query.trim() || undefined)
}

function onSelect(owner: SmartScriptOwner) {
  router.push(`/smart-scripts/${owner.source_type}/${owner.entryorguid}`)
}

function ownerTitle(owner: SmartScriptOwner): string {
  return owner.name ? owner.name : `#${owner.entryorguid}`
}

function ownerMeta(owner: SmartScriptOwner): string {
  const label = sourceTypeLabels[owner.source_type] ?? `Type ${owner.source_type}`
  return `${label} · #${owner.entryorguid} · ${owner.row_count} rows`
}

onMounted(() => {
  if (!store.listLoaded) {
    store.loadOwners()
  }
})

// --- Creation dialog ---
const createDialogVisible = ref(false)
const createSourceType = ref(0)
const createEntry = ref<number | null>(null)
const createError = ref('')
const createChecking = ref(false)

const createSourceOptions = [
  { value: 0, name: 'Creature' },
  { value: 1, name: 'GameObject' },
  { value: 2, name: 'Areatrigger' },
]

function onAdd() {
  createError.value = ''
  createEntry.value = null
  createDialogVisible.value = true
}

async function onCreateConfirm() {
  if (createEntry.value == null || createEntry.value === 0) return
  createChecking.value = true
  createError.value = ''
  try {
    const info = await getSmartScriptOwnerInfo(createEntry.value, createSourceType.value)
    if (!info.exists) {
      createError.value = t('smartScripts.create.notFound')
      return
    }
    createDialogVisible.value = false
    router.push(`/smart-scripts/${createSourceType.value}/${createEntry.value}`)
  } catch (e) {
    createError.value = String(e)
  } finally {
    createChecking.value = false
  }
}

async function onExecute() {
  try {
    await store.saveScript()
    await store.loadOwners()
  } catch (e) {
    console.error('Failed to save smart script:', e)
  }
}
</script>

<template>
  <EntityWorkspace storageKey="smartScripts" listWidth="300px">
    <template #list>
      <EntityListPanel
        :items="store.owners"
        :idOf="(owner: SmartScriptOwner) => encodeScriptKey(owner.entryorguid, owner.source_type)"
        :titleOf="ownerTitle"
        :metaOf="ownerMeta"
        :selectedId="keyParam ?? null"
        :modifiedIds="store.modifiedIds"
        :loading="store.loading"
        :searchPlaceholder="t('smartScripts.searchPlaceholder')"
        @select="onSelect"
        @add="onAdd"
        @search="onSearch"
      />
    </template>

    <template #editor>
      <template v-if="selection">
        <EditorHeader
          :title="form.name"
          :subtitle="sourceTypeLabels[selection.sourceType]"
          :id="selection.entryorguid"
          table="smart_scripts"
          :showBack="false"
          :hasChanges="store.combinedHasChanges"
          :discardLabel="t('smartScripts.discard')"
          :executeLabel="t('smartScripts.execute')"
          @discard="store.discardChanges()"
          @execute="onExecute"
        />

        <SmartScriptsPanel
          ref="panel"
          :entryorguid="selection.entryorguid"
          :sourceType="selection.sourceType"
        />
      </template>

      <WorkspaceEmptyState v-else />
    </template>

    <template #inspector>
      <InspectorPanel
        v-if="selection"
        :title="t('workspace.inspector')"
        :subtitle="form.name"
        storageKey="smartScripts"
        :changedFields="store.combinedChangedFields"
        :diffQuery="store.combinedDiffQuery"
        :fullQuery="store.scriptFullQuery"
        :hasChanges="store.combinedHasChanges"
      >
        <template #facts>
          <dl class="sai-facts">
            <div class="sai-facts-row">
              <dt>{{ t('smartScripts.facts.source') }}</dt>
              <dd>{{ sourceTypeLabels[selection.sourceType] ?? selection.sourceType }}</dd>
            </div>
            <div class="sai-facts-row">
              <dt>{{ t('smartScripts.facts.events') }}</dt>
              <dd>{{ panel?.chains.length ?? 0 }}</dd>
            </div>
            <div class="sai-facts-row">
              <dt>{{ t('smartScripts.facts.actionlists') }}</dt>
              <dd>{{ panel?.actionlists.length ?? 0 }}</dd>
            </div>
          </dl>
        </template>
      </InspectorPanel>
    </template>
  </EntityWorkspace>

  <Dialog
    v-model:visible="createDialogVisible"
    :header="t('smartScripts.create.title')"
    modal
    :draggable="false"
    :style="{ width: '26rem' }"
  >
    <div class="sai-create-form">
      <label class="sai-create-label">{{ t('smartScripts.create.sourceType') }}</label>
      <Select
        v-model="createSourceType"
        :options="createSourceOptions"
        optionLabel="name"
        optionValue="value"
        fluid
      />
      <label class="sai-create-label">{{ t('smartScripts.create.entry') }}</label>
      <InputNumber
        v-model="createEntry"
        :useGrouping="false"
        fluid
        :placeholder="t('smartScripts.create.entryPlaceholder')"
      />
      <p v-if="createError" class="sai-create-error">{{ createError }}</p>
    </div>
    <template #footer>
      <Button :label="t('smartScripts.create.cancel')" severity="secondary" text @click="createDialogVisible = false" />
      <Button
        :label="t('smartScripts.create.open')"
        :loading="createChecking"
        :disabled="createEntry == null || createEntry === 0"
        @click="onCreateConfirm"
      />
    </template>
  </Dialog>
</template>

<style scoped>
@import './smart-scripts-editor.css';

.sai-facts {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.sai-facts-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.78rem;
}

.sai-facts-row dt {
  color: var(--text-muted);
}

.sai-facts-row dd {
  margin: 0;
  color: var(--text);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.sai-create-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.25rem 0;
}

.sai-create-label {
  font-size: var(--font-label);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.sai-create-error {
  margin: 0.25rem 0 0;
  color: var(--danger);
  font-size: 0.78rem;
}
</style>
