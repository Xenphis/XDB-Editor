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
import EditorField from '@core/components/EditorField.vue'
import BitmaskField from '@core/components/BitmaskField.vue'
import type {
  CreatureFormationGroup,
  CreatureSpawnOption,
} from '@/modules/npc/types/misc/creature_formations'
import { formation_group_ai_options } from '@/modules/npc/types/misc/creature_formations'
import { getCreatureFormationGroups, searchCreatureSpawns } from '@/modules/npc/service'
import {
  useFormationStore,
  createMemberEntry,
  type FormationMemberEntry,
} from '@/modules/npc/stores/formationStore'
import FormationPreview from './editor/formation/FormationPreview.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useFormationStore()

/** undefined = no selection, number = the formation's leader GUID. */
const leaderGuid = computed<number | undefined>(() => {
  const param = route.params.leaderGuid as string | undefined
  if (param === undefined || param === '') return undefined
  const n = Number(param)
  return Number.isNaN(n) ? undefined : n
})

const loading = ref(false)

watch(leaderGuid, async (val) => {
  if (val === undefined) {
    store.closeEditor()
    return
  }
  if (store.editorDataLoaded && store.editingId === val) return
  loading.value = true
  try {
    await store.openEditor(val)
    await store.ensureLeaderRow(val)
  } catch (e) {
    console.error('Failed to load formation:', e)
  } finally {
    loading.value = false
  }
}, { immediate: true })

// --- List ---
const searchQuery = ref('')

const filteredGroups = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return store.groups
  const n = Number(q)
  return store.groups.filter(g =>
    (!isNaN(n) && (g.leaderGUID === n || g.entry === n)) ||
    (g.name ?? '').toLowerCase().includes(q)
  )
})

async function loadGroups() {
  store.loading = true
  try {
    store.setGroups(await getCreatureFormationGroups())
    store.markListLoaded()
  } catch (e) {
    console.error('Failed to load formations:', e)
  } finally {
    store.loading = false
  }
}

function titleOf(group: CreatureFormationGroup): string {
  return `#${group.leaderGUID} ${group.name ?? ''}`.trim()
}

function metaOf(group: CreatureFormationGroup): string {
  const members = t('formation.memberCount', group.memberCount)
  return group.map != null ? `${members} · map ${group.map}` : members
}

function onSelect(group: CreatureFormationGroup) {
  router.push(`/npc/formation/${group.leaderGUID}`)
}

onMounted(() => {
  if (!store.listLoaded) {
    loadGroups()
  }
})

// --- Spawn picker (used for both "new formation" and "add member") ---
type PickerMode = 'leader' | 'member'

const pickerOpen = ref(false)
const pickerMode = ref<PickerMode>('leader')
const pickerQuery = ref('')
const pickerResults = ref<CreatureSpawnOption[]>([])
const pickerLoading = ref(false)

function openPicker(mode: PickerMode) {
  pickerMode.value = mode
  pickerQuery.value = ''
  pickerResults.value = []
  pickerOpen.value = true
}

async function runPickerSearch() {
  const query = pickerQuery.value.trim()
  if (!query) {
    pickerResults.value = []
    return
  }
  pickerLoading.value = true
  try {
    // A formation only makes sense inside one map, so members are searched on
    // the leader's map; the leader itself is searched across every map.
    const map = pickerMode.value === 'member' ? store.leaderMap : null
    pickerResults.value = await searchCreatureSpawns(query, map)
  } catch (e) {
    console.error('Failed to search spawns:', e)
  } finally {
    pickerLoading.value = false
  }
}

/** memberGUID is the table's primary key: a spawn already in another
    formation is moved, not duplicated. */
function pickerWarning(option: CreatureSpawnOption): string | null {
  if (option.leaderGUID == null) return null
  if (option.leaderGUID === store.formData.leaderGUID) return t('formation.picker.alreadyHere')
  return t('formation.picker.movedFrom', { leader: option.leaderGUID })
}

function isPickable(option: CreatureSpawnOption): boolean {
  if (pickerMode.value === 'leader') return true
  return !store.members.getNewEntries().some(m => m.memberGUID === option.guid)
}

function onPick(option: CreatureSpawnOption) {
  if (!isPickable(option)) return
  pickerOpen.value = false
  if (pickerMode.value === 'leader') {
    router.push(`/npc/formation/${option.guid}`)
    return
  }
  store.addMember(createMemberEntry(option.guid, {
    groupAI: store.leaderRow?.groupAI ?? 0,
    name: option.name,
    entry: option.id,
  }))
}

// --- Editor ---
const isLeaderRow = (member: FormationMemberEntry) => member.memberGUID === store.formData.leaderGUID

function onMove(memberGUID: number, dist: number, angle: number) {
  const member = store.members.getNewEntries().find(m => m.memberGUID === memberGUID)
  if (!member) return
  member.dist = dist
  member.angle = angle
}

const leaderGroupAI = computed({
  get: () => store.leaderRow?.groupAI ?? 0,
  set: (value: number) => {
    if (store.leaderRow) store.leaderRow.groupAI = value
  },
})

const currentGroup = computed(() => store.groups.find(g => g.leaderGUID === leaderGuid.value))

async function onExecute() {
  try {
    await store.saveCurrent()
    await loadGroups()
  } catch (e) {
    console.error('Failed to save formation:', e)
  }
}

function onDiscard() {
  store.discardChanges()
}

async function onRemoveGroup(group: CreatureFormationGroup) {
  try {
    await store.deleteCurrent(group.leaderGUID)
    if (leaderGuid.value === group.leaderGUID) {
      router.push('/npc/formation')
    }
    await loadGroups()
  } catch (e) {
    console.error('Failed to delete formation:', e)
  }
}
</script>

<template>
  <EntityWorkspace storageKey="npc.formation">
    <template #list>
      <EntityListPanel
        :items="filteredGroups"
        :idOf="(g: CreatureFormationGroup) => g.leaderGUID"
        :titleOf="titleOf"
        :metaOf="metaOf"
        :selectedId="leaderGuid ?? null"
        :modifiedIds="store.modifiedIds"
        :loading="store.loading"
        :searchPlaceholder="t('formation.searchPlaceholder')"
        removable
        @select="onSelect"
        @add="openPicker('leader')"
        @search="(q: string) => searchQuery = q"
        @remove="onRemoveGroup"
      />
    </template>

    <template #editor>
      <template v-if="leaderGuid !== undefined">
        <EditorHeader
          :subtitle="t('formation.editorTitle')"
          :id="leaderGuid"
          table="creature_formations"
          :showBack="false"
          :hasChanges="store.combinedHasChanges"
          :discardLabel="t('formation.discard')"
          :executeLabel="t('formation.execute')"
          @discard="onDiscard"
          @execute="onExecute"
        />

        <div v-if="loading" class="editor-loading">
          <i class="pi pi-spin pi-spinner"></i>
        </div>

        <template v-else>
          <!-- Shape -->
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('formation.groups.shape') }}</h4>
              <p>{{ t('formation.groups.shapeDesc') }}</p>
            </div>
            <div class="formation-shape">
              <FormationPreview
                :members="store.orderedMembers"
                :leaderGuid="store.formData.leaderGUID"
                @move="onMove"
              />
              <div class="formation-shape-side">
                <EditorField :label="t('formation.fields.groupAI')" :tooltip="t('formation.fields.groupAITooltip')">
                  <BitmaskField
                    v-model="leaderGroupAI"
                    :options="formation_group_ai_options"
                    :label="t('formation.fields.groupAI')"
                  />
                </EditorField>
                <Button
                  class="formation-apply-all"
                  severity="secondary"
                  size="small"
                  outlined
                  :label="t('formation.applyGroupAIToAll')"
                  @click="store.applyGroupAIToAll(leaderGroupAI)"
                />
              </div>
            </div>
          </div>

          <!-- Members -->
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('formation.groups.members') }}</h4>
              <p>{{ t('formation.groups.membersDesc') }}</p>
            </div>

            <table class="formation-table">
              <thead>
                <tr>
                  <th class="col-guid">{{ t('formation.columns.memberGUID') }}</th>
                  <th class="col-num">{{ t('formation.columns.dist') }}</th>
                  <th class="col-num">{{ t('formation.columns.angle') }}</th>
                  <th class="col-num">{{ t('formation.columns.point_1') }}</th>
                  <th class="col-num">{{ t('formation.columns.point_2') }}</th>
                  <th class="col-action"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="member in store.orderedMembers" :key="member.memberGUID">
                  <td class="col-guid">
                    <span v-if="isLeaderRow(member)" class="formation-leader-tag">
                      <i class="pi pi-flag"></i>{{ t('formation.leader') }}
                    </span>
                    <span class="formation-guid">#{{ member.memberGUID }}</span>
                    <span class="formation-name">{{ member.name ?? t('formation.unknownSpawn') }}</span>
                  </td>
                  <td class="col-num">
                    <span v-if="isLeaderRow(member)" class="formation-fixed">0</span>
                    <InputNumber
                      v-else
                      v-model="member.dist"
                      :minFractionDigits="0"
                      :maxFractionDigits="2"
                      :min="0"
                      :useGrouping="false"
                      fluid
                    />
                  </td>
                  <td class="col-num">
                    <span v-if="isLeaderRow(member)" class="formation-fixed">0</span>
                    <InputNumber
                      v-else
                      v-model="member.angle"
                      :minFractionDigits="0"
                      :maxFractionDigits="2"
                      :min="0"
                      :max="360"
                      suffix="°"
                      :useGrouping="false"
                      fluid
                    />
                  </td>
                  <td class="col-num">
                    <InputNumber v-model="member.point_1" :useGrouping="false" :min="0" fluid />
                  </td>
                  <td class="col-num">
                    <InputNumber v-model="member.point_2" :useGrouping="false" :min="0" fluid />
                  </td>
                  <td class="col-action">
                    <Button
                      v-if="!isLeaderRow(member)"
                      icon="pi pi-trash"
                      severity="danger"
                      text
                      rounded
                      size="small"
                      @click="store.removeMember(member.memberGUID)"
                    />
                  </td>
                </tr>
                <tr v-if="store.orderedMembers.length === 0">
                  <td colspan="6" class="formation-empty">{{ t('formation.noMembers') }}</td>
                </tr>
              </tbody>
            </table>

            <Button
              class="formation-add"
              icon="pi pi-plus"
              severity="secondary"
              size="small"
              text
              :label="t('formation.addMember')"
              @click="openPicker('member')"
            />
          </div>
        </template>
      </template>

      <WorkspaceEmptyState v-else />
    </template>

    <template #inspector>
      <InspectorPanel
        v-if="leaderGuid !== undefined"
        :title="t('workspace.inspector')"
        :subtitle="currentGroup?.name ?? undefined"
        storageKey="npc.formation"
        :changedFields="store.combinedChangedFields"
        :diffQuery="store.combinedDiffQuery"
        :fullQuery="store.combinedFullQuery"
        :hasChanges="store.combinedHasChanges"
      >
        <template #facts>
          <dl class="formation-facts">
            <div class="formation-facts-row">
              <dt>{{ t('formation.columns.entry') }}</dt>
              <dd>{{ currentGroup?.entry ?? '—' }}</dd>
            </div>
            <div class="formation-facts-row">
              <dt>{{ t('formation.columns.map') }}</dt>
              <dd>{{ store.leaderMap ?? '—' }}</dd>
            </div>
            <div class="formation-facts-row">
              <dt>{{ t('formation.columns.members') }}</dt>
              <dd>{{ store.orderedMembers.length }}</dd>
            </div>
          </dl>
        </template>
      </InspectorPanel>
    </template>
  </EntityWorkspace>

  <!-- Spawn picker -->
  <Dialog
    v-model:visible="pickerOpen"
    modal
    :header="pickerMode === 'leader' ? t('formation.picker.leaderTitle') : t('formation.picker.memberTitle')"
    :style="{ width: '32rem' }"
  >
    <div class="picker-search">
      <InputText
        v-model="pickerQuery"
        :placeholder="t('formation.picker.placeholder')"
        fluid
        @keyup.enter="runPickerSearch"
      />
      <Button icon="pi pi-search" :loading="pickerLoading" @click="runPickerSearch" />
    </div>

    <ul class="picker-results">
      <li
        v-for="option in pickerResults"
        :key="option.guid"
        class="picker-row"
        :class="{ disabled: !isPickable(option) }"
        @click="onPick(option)"
      >
        <div>
          <span class="picker-guid">#{{ option.guid }}</span>
          <span class="picker-name">{{ option.name ?? `entry ${option.id}` }}</span>
        </div>
        <span v-if="pickerWarning(option)" class="picker-warning">{{ pickerWarning(option) }}</span>
        <span v-else class="picker-meta">map {{ option.map }}</span>
      </li>
      <li v-if="!pickerLoading && pickerResults.length === 0" class="picker-empty">
        {{ t('formation.picker.empty') }}
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

.formation-shape {
  display: grid;
  grid-template-columns: minmax(0, 260px) minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
}

.formation-shape-side {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.formation-apply-all {
  align-self: flex-start;
}

.formation-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-field);
}

.formation-table th {
  text-align: left;
  font-size: var(--font-label);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  padding: 0 0.3rem 0.4rem;
}

.formation-table td {
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

.formation-leader-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: var(--font-label);
  color: var(--accent);
  margin-right: 0.4rem;
}

.formation-guid {
  font-variant-numeric: tabular-nums;
  color: var(--text);
  margin-right: 0.4rem;
}

.formation-name {
  color: var(--text-muted);
}

.formation-fixed {
  color: var(--text-placeholder);
  font-variant-numeric: tabular-nums;
}

.formation-empty,
.picker-empty {
  color: var(--text-muted);
  text-align: center;
  padding: 1rem 0;
}

.formation-add {
  margin-top: 0.5rem;
}

.formation-facts {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.formation-facts-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.78rem;
}

.formation-facts-row dt {
  color: var(--text-muted);
}

.formation-facts-row dd {
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

.picker-guid {
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
