<script setup lang="ts">
import { ref, computed, watch, onMounted, toRef } from 'vue'
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
import type { CreatureClassLevelStats } from '@/modules/class_level_stats/types'
import {
  useCreatureClassLevelStatsStore,
  generateDiffQuery,
  generateFullQuery,
  getChangedFields,
} from '@/modules/class_level_stats/store'
import { useTableFieldModifiers } from '@core/composables/useTableFieldModifiers'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useCreatureClassLevelStatsStore()
const { isFieldModified, changedFields } = useTableFieldModifiers(store, getChangedFields)

const form = store.formData
const originalValue = toRef(store, 'originalValue')
const loading = ref(false)

function classLabel(classId: number): string {
  return t(`creature_classlevelstats.classes.${classId}`)
}

function keyOf(row: CreatureClassLevelStats): string {
  return `${row.level}:${row.class}`
}

/** undefined = no selection, {level, classId} = edit (no create mode here). */
const selection = computed<{ level: number; classId: number } | undefined>(() => {
  const level = Number(route.params.level)
  const classId = Number(route.params.classId)
  if (!Number.isFinite(level) || !Number.isFinite(classId) || route.params.level === undefined || route.params.level === '') {
    return undefined
  }
  return { level, classId }
})

const selectedKey = computed(() => (selection.value ? `${selection.value.level}:${selection.value.classId}` : null))

watch(selection, async (val) => {
  if (val === undefined) return
  if (store.editorDataLoaded && form.level === val.level && form.class === val.classId) return
  loading.value = true
  try {
    await store.openEditor(val.level, val.classId)
  } catch (e) {
    console.error('Failed to load creature_classlevelstats:', e)
  } finally {
    loading.value = false
  }
}, { immediate: true })

// --- List (client-side filter) ---
const searchQuery = ref('')

const filteredEntries = computed(() => {
  const q = searchQuery.value.trim()
  if (!q) return store.entries
  const n = Number(q)
  if (!isNaN(n)) return store.entries.filter(r => r.level === n)
  const lower = q.toLowerCase()
  return store.entries.filter(r => classLabel(r.class).toLowerCase().includes(lower))
})

const modifiedKeys = computed<Set<string | number>>(() => {
  const set = new Set<string | number>()
  if (hasChanges.value && store.editorDataLoaded) {
    set.add(`${form.level}:${form.class}`)
  }
  return set
})

function onSearch(query: string) {
  searchQuery.value = query
}

function onSelect(row: CreatureClassLevelStats) {
  router.push(`/class-level-stats/${row.level}/${row.class}`)
}

onMounted(() => {
  if (!store.listLoaded) {
    store.fetchEntries()
  }
})

// --- Editor ---
const diffQuery = computed(() => {
  if (!originalValue.value) return ''
  return generateDiffQuery(originalValue.value, form)
})

const fullQuery = computed(() => generateFullQuery(form))
const hasChanges = computed(() => changedFields.value.length > 0)

async function onExecute() {
  try {
    await store.saveEntry()
    await store.fetchEntries()
  } catch (e) {
    console.error('Failed to save creature_classlevelstat:', e)
  }
}

function onDiscard() {
  if (originalValue.value) {
    Object.assign(form, originalValue.value)
  }
}
</script>

<template>
  <EntityWorkspace storageKey="classLevelStats">
    <template #list>
      <EntityListPanel
        :items="filteredEntries"
        :idOf="keyOf"
        :titleOf="(r: CreatureClassLevelStats) => `${classLabel(r.class)} — niv. ${r.level}`"
        :metaOf="(r: CreatureClassLevelStats) => `HP ${r.basehp0.toLocaleString()} · dmg ${r.damage_base.toFixed(2)}`"
        :selectedId="selectedKey"
        :modifiedIds="modifiedKeys"
        :loading="store.loading"
        :searchPlaceholder="t('creature_classlevelstats.searchPlaceholder')"
        :showAdd="false"
        @select="onSelect"
        @search="onSearch"
      />
    </template>

    <template #editor>
      <template v-if="selection !== undefined">
        <EditorHeader
          :subtitle="`${classLabel(form.class)} — niv. ${form.level}`"
          table="creature_classlevelstats"
          :showBack="false"
          :hasChanges="hasChanges"
          :discardLabel="t('editor.discard', 'Annuler')"
          :executeLabel="t('editor.execute', 'Exécuter')"
          @discard="onDiscard"
          @execute="onExecute"
        />

        <div v-if="loading" class="editor-loading">
          <i class="pi pi-spin pi-spinner"></i>
        </div>

        <template v-else-if="store.editorDataLoaded">
          <!-- Health -->
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('creature_classlevelstats.groups.health') }}</h4>
              <p>{{ t('creature_classlevelstats.groups.healthDesc') }}</p>
            </div>
            <div class="field-grid">
              <EditorField
                :label="t('creature_classlevelstats.fields.basehp0')"
                :modified="isFieldModified('basehp0')"
                :tooltip="t('creature_classlevelstats.tooltips.basehp0')"
              >
                <InputNumber v-model="form.basehp0" :useGrouping="false" :min="1" fluid />
              </EditorField>
              <EditorField
                :label="t('creature_classlevelstats.fields.basehp1')"
                :modified="isFieldModified('basehp1')"
                :tooltip="t('creature_classlevelstats.tooltips.basehp1')"
              >
                <InputNumber v-model="form.basehp1" :useGrouping="false" :min="1" fluid />
              </EditorField>
              <EditorField
                :label="t('creature_classlevelstats.fields.basehp2')"
                :modified="isFieldModified('basehp2')"
                :tooltip="t('creature_classlevelstats.tooltips.basehp2')"
              >
                <InputNumber v-model="form.basehp2" :useGrouping="false" :min="1" fluid />
              </EditorField>
            </div>
          </div>

          <!-- Resources -->
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('creature_classlevelstats.groups.resources') }}</h4>
              <p>{{ t('creature_classlevelstats.groups.resourcesDesc') }}</p>
            </div>
            <div class="field-grid">
              <EditorField
                :label="t('creature_classlevelstats.fields.basemana')"
                :modified="isFieldModified('basemana')"
              >
                <InputNumber v-model="form.basemana" :useGrouping="false" :min="1" fluid />
              </EditorField>
              <EditorField
                :label="t('creature_classlevelstats.fields.basearmor')"
                :modified="isFieldModified('basearmor')"
              >
                <InputNumber v-model="form.basearmor" :useGrouping="false" :min="1" fluid />
              </EditorField>
            </div>
          </div>

          <!-- Attack Power -->
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('creature_classlevelstats.groups.attack') }}</h4>
              <p>{{ t('creature_classlevelstats.groups.attackDesc') }}</p>
            </div>
            <div class="field-grid">
              <EditorField
                :label="t('creature_classlevelstats.fields.attackpower')"
                :modified="isFieldModified('attackpower')"
                :tooltip="t('creature_classlevelstats.tooltips.attackpower')"
              >
                <InputNumber v-model="form.attackpower" :useGrouping="false" :min="0" fluid />
              </EditorField>
              <EditorField
                :label="t('creature_classlevelstats.fields.rangedattackpower')"
                :modified="isFieldModified('rangedattackpower')"
                :tooltip="t('creature_classlevelstats.tooltips.rangedattackpower')"
              >
                <InputNumber v-model="form.rangedattackpower" :useGrouping="false" :min="0" fluid />
              </EditorField>
            </div>
          </div>

          <!-- Damage -->
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('creature_classlevelstats.groups.damage') }}</h4>
              <p>{{ t('creature_classlevelstats.groups.damageDesc') }}</p>
            </div>
            <div class="field-grid">
              <EditorField
                :label="t('creature_classlevelstats.fields.damage_base')"
                :modified="isFieldModified('damage_base')"
                :tooltip="t('creature_classlevelstats.tooltips.damage_base')"
              >
                <InputNumber v-model="form.damage_base" :minFractionDigits="2" :maxFractionDigits="6" :min="0" fluid />
              </EditorField>
              <EditorField
                :label="t('creature_classlevelstats.fields.damage_exp1')"
                :modified="isFieldModified('damage_exp1')"
                :tooltip="t('creature_classlevelstats.tooltips.damage_exp1')"
              >
                <InputNumber v-model="form.damage_exp1" :minFractionDigits="2" :maxFractionDigits="6" :min="0" fluid />
              </EditorField>
              <EditorField
                :label="t('creature_classlevelstats.fields.damage_exp2')"
                :modified="isFieldModified('damage_exp2')"
                :tooltip="t('creature_classlevelstats.tooltips.damage_exp2')"
              >
                <InputNumber v-model="form.damage_exp2" :minFractionDigits="2" :maxFractionDigits="6" :min="0" fluid />
              </EditorField>
            </div>
          </div>

          <!-- Primary Stats (AzerothCore-only) -->
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('creature_classlevelstats.groups.primaryStats') }}</h4>
              <p>{{ t('creature_classlevelstats.groups.primaryStatsDesc') }}</p>
            </div>
            <div class="field-grid">
              <EditorField
                :label="t('creature_classlevelstats.fields.Strength')"
                :modified="isFieldModified('Strength')"
              >
                <InputNumber v-model="form.Strength" :useGrouping="false" fluid />
              </EditorField>
              <EditorField
                :label="t('creature_classlevelstats.fields.Agility')"
                :modified="isFieldModified('Agility')"
              >
                <InputNumber v-model="form.Agility" :useGrouping="false" fluid />
              </EditorField>
              <EditorField
                :label="t('creature_classlevelstats.fields.Stamina')"
                :modified="isFieldModified('Stamina')"
              >
                <InputNumber v-model="form.Stamina" :useGrouping="false" fluid />
              </EditorField>
              <EditorField
                :label="t('creature_classlevelstats.fields.Intellect')"
                :modified="isFieldModified('Intellect')"
              >
                <InputNumber v-model="form.Intellect" :useGrouping="false" fluid />
              </EditorField>
              <EditorField
                :label="t('creature_classlevelstats.fields.Spirit')"
                :modified="isFieldModified('Spirit')"
              >
                <InputNumber v-model="form.Spirit" :useGrouping="false" fluid />
              </EditorField>
            </div>
          </div>

          <!-- Misc -->
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('creature_classlevelstats.groups.misc') }}</h4>
              <p>{{ t('creature_classlevelstats.groups.miscDesc') }}</p>
            </div>
            <div class="field-grid">
              <EditorField
                :label="t('creature_classlevelstats.fields.comment')"
                :modified="isFieldModified('comment')"
                :fullWidth="true"
              >
                <InputText v-model="form.comment" fluid />
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
        :subtitle="`${classLabel(form.class)} — niv. ${form.level}`"
        storageKey="classLevelStats"
        :changedFields="changedFields"
        :diffQuery="diffQuery"
        :fullQuery="fullQuery"
        :hasChanges="hasChanges"
      >
        <template #facts>
          <dl class="cls-facts">
            <div class="cls-facts-row">
              <dt>{{ t('creature_classlevelstats.fields.basehp0') }}</dt>
              <dd>{{ form.basehp0.toLocaleString() }}</dd>
            </div>
            <div class="cls-facts-row">
              <dt>{{ t('creature_classlevelstats.fields.damage_base') }}</dt>
              <dd>{{ form.damage_base.toFixed(2) }}</dd>
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

.cls-facts {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.cls-facts-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.78rem;
}

.cls-facts-row dt {
  color: var(--text-muted);
}

.cls-facts-row dd {
  margin: 0;
  color: var(--text);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
</style>
