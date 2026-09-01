<script setup lang="ts">
import { ref, reactive, onMounted, computed, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import BitmaskField from '@core/components/BitmaskField.vue'
import EditorHeader from '@core/components/EditorHeader.vue'
import type { FieldChange } from '@core/composables/useQueryGenerator'
import type { GameObject } from '@/modules/game_objects/types/gameobject/gameobject'
import { useGameObjectEnumOptions } from '@/modules/game_objects/composables/useGameObjectEnumOptions'
import { getGameObjectSpawns, getGameObjectSpawnAddon } from '@/modules/game_objects/service'
import { useGameObjectModuleStore, type SpawnAddonForm } from '@/modules/game_objects/store'
import { useQueryGenerator } from '@core/composables/useQueryGenerator'
import EditorField from '@core/components/EditorField.vue'

/** Shared reactive state pushed up to the workspace inspector (SQL + diff). */
export interface GoSpawnInspectorState {
  diffQuery: string
  fullQuery: string
  hasChanges: boolean
  changedFields: FieldChange[]
}

const { t } = useI18n()

const props = defineProps<{
  spawnGuid: number
  goEntry: number
  /** Optional reactive sink so the workspace right rail can show spawn SQL. */
  inspector?: GoSpawnInspectorState
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: GameObject): void
}>()

const loading = ref(false)
const store = useGameObjectModuleStore()

const { spawnMaskOptions, invisibilityTypeOptions } = useGameObjectEnumOptions()

const stateOptions = [
  { value: 0, label: t('gameobjectSpawnEditor.stateOptions.open') },
  { value: 1, label: t('gameobjectSpawnEditor.stateOptions.closed') },
]

const form = reactive<GameObject>({
  guid: 0,
  id: 0,
  map: 0,
  zoneId: 0,
  areaId: 0,
  spawnMask: 1,
  phaseMask: 1,
  position_x: 0,
  position_y: 0,
  position_z: 0,
  orientation: 0,
  rotation0: 0,
  rotation1: 0,
  rotation2: 0,
  rotation3: 0,
  spawntimesecs: 300,
  animprogress: 0,
  state: 1,
  ScriptName: '',
  VerifiedBuild: 0,
  Comment: null,
})

const originalValue = ref<GameObject | null>(null)

const { diffQuery, fullQuery, hasChanges, changedFields } = useQueryGenerator<GameObject>(
  'gameobject',
  'guid',
  originalValue,
  form,
)

// --- Spawn Addon ---
const addonForm = store.spawnAddon.newEntry
const addonOriginalValue = ref<SpawnAddonForm | null>(null)

const { diffQuery: addonDiffQuery, hasChanges: addonHasChanges, changedFields: addonChangedFields } = useQueryGenerator<SpawnAddonForm>(
  'gameobject_addon',
  'guid',
  addonOriginalValue,
  addonForm,
)

const addonModifiedFieldSet = computed(() => new Set(addonChangedFields.value.map(c => c.field)))
function isAddonModified(field: string): boolean {
  return addonModifiedFieldSet.value.has(field)
}

const combinedDiffQuery = computed(() => {
  const parts: string[] = []
  if (diffQuery.value) parts.push(diffQuery.value)
  if (addonDiffQuery.value) parts.push(addonDiffQuery.value)
  return parts.join('\n')
})

const combinedHasChanges = computed(() => hasChanges.value || addonHasChanges.value)

const modifiedFieldSet = computed(() => new Set(changedFields.value.map(c => c.field)))

function isFieldModified(field: string): boolean {
  return modifiedFieldSet.value.has(field)
}

const combinedChangedFields = computed(() => [
  ...changedFields.value,
  ...addonChangedFields.value,
])

// Mirror the spawn's SQL/diff into the workspace inspector (right rail).
watchEffect(() => {
  if (!props.inspector) return
  props.inspector.diffQuery = combinedDiffQuery.value
  props.inspector.fullQuery = fullQuery.value
  props.inspector.hasChanges = combinedHasChanges.value
  props.inspector.changedFields = combinedChangedFields.value
})

function onDiscard() {
  if (originalValue.value) Object.assign(form, originalValue.value)
  if (addonOriginalValue.value) Object.assign(store.spawnAddon.newEntry, addonOriginalValue.value)
}

function onSave() {
  emit('save', { ...form })
}

onMounted(async () => {
  loading.value = true
  try {
    const [spawns, addonData] = await Promise.all([
      getGameObjectSpawns(props.goEntry),
      getGameObjectSpawnAddon(props.spawnGuid).catch(() => null),
    ])
    const spawn = spawns.find(s => s.guid === props.spawnGuid)
    if (spawn) {
      Object.assign(form, spawn)
      originalValue.value = { ...spawn }
    }
    if (addonData) {
      const { guid: _g, ...addonFields } = addonData
      store.spawnAddon.load(addonFields as SpawnAddonForm)
      addonOriginalValue.value = { ...addonFields } as SpawnAddonForm
    } else {
      store.spawnAddon.commit()
      addonOriginalValue.value = { ...store.spawnAddon.newEntry }
    }
  } catch (e) {
    console.error('Failed to load spawn:', e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="spawn-editor">
    <!-- Header -->
    <EditorHeader
      :subtitle="t('gameobjectSpawnEditor.editorTitle')"
      :id="form.guid"
      table="gameobject"
      :backLabel="t('gameobjectSpawnEditor.back')"
      :hasChanges="combinedHasChanges"
      :discardLabel="t('gameobjectSpawnEditor.discard')"
      :executeLabel="t('gameobjectSpawnEditor.save')"
      @back="emit('close')"
      @discard="onDiscard"
      @execute="onSave"
    />

    <!-- Identification -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('gameobjectSpawnEditor.groups.identification') }}</h4>
        <p>{{ t('gameobjectSpawnEditor.groups.identificationDesc') }}</p>
      </div>
      <div class="field-grid">
        <EditorField :label="t('gameobjectSpawnEditor.fields.guid')" :modified="isFieldModified('guid')">
          <InputNumber v-model="form.guid" :useGrouping="false" fluid disabled />
        </EditorField>
        <EditorField :label="t('gameobjectSpawnEditor.fields.id')" :modified="isFieldModified('id')">
          <InputNumber v-model="form.id" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('gameobjectSpawnEditor.fields.map')" :modified="isFieldModified('map')">
          <InputNumber v-model="form.map" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('gameobjectSpawnEditor.fields.zoneId')" :modified="isFieldModified('zoneId')">
          <InputNumber v-model="form.zoneId" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('gameobjectSpawnEditor.fields.areaId')" :modified="isFieldModified('areaId')">
          <InputNumber v-model="form.areaId" :useGrouping="false" fluid />
        </EditorField>
      </div>
    </div>

    <!-- Spawn Settings -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('gameobjectSpawnEditor.groups.spawnSettings') }}</h4>
        <p>{{ t('gameobjectSpawnEditor.groups.spawnSettingsDesc') }}</p>
      </div>
      <div class="field-grid">
        <EditorField :label="t('gameobjectSpawnEditor.fields.spawnMask')" :modified="isFieldModified('spawnMask')">
          <BitmaskField v-model="form.spawnMask" :options="spawnMaskOptions" :label="t('gameobjectSpawnEditor.fields.spawnMask')" />
        </EditorField>
        <EditorField :label="t('gameobjectSpawnEditor.fields.phaseMask')" :tooltip="t('gameobjectSpawnEditor.tooltips.phaseMask')" :modified="isFieldModified('phaseMask')">
          <InputNumber v-model="form.phaseMask" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('gameobjectSpawnEditor.fields.spawntimesecs')" :modified="isFieldModified('spawntimesecs')">
          <InputNumber v-model="form.spawntimesecs" :useGrouping="false" fluid />
        </EditorField>
      </div>
    </div>

    <!-- Position -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('gameobjectSpawnEditor.groups.position') }}</h4>
        <p>{{ t('gameobjectSpawnEditor.groups.positionDesc') }}</p>
      </div>
      <div class="field-grid">
        <EditorField :label="t('gameobjectSpawnEditor.fields.position_x')" :modified="isFieldModified('position_x')">
          <InputNumber v-model="form.position_x" :minFractionDigits="1" :maxFractionDigits="6" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('gameobjectSpawnEditor.fields.position_y')" :modified="isFieldModified('position_y')">
          <InputNumber v-model="form.position_y" :minFractionDigits="1" :maxFractionDigits="6" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('gameobjectSpawnEditor.fields.position_z')" :modified="isFieldModified('position_z')">
          <InputNumber v-model="form.position_z" :minFractionDigits="1" :maxFractionDigits="6" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('gameobjectSpawnEditor.fields.orientation')" :modified="isFieldModified('orientation')">
          <InputNumber v-model="form.orientation" :minFractionDigits="1" :maxFractionDigits="6" :useGrouping="false" fluid />
        </EditorField>
      </div>
    </div>

    <!-- Rotation -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('gameobjectSpawnEditor.groups.rotation') }}</h4>
        <p>{{ t('gameobjectSpawnEditor.groups.rotationDesc') }}</p>
      </div>
      <div class="field-grid">
        <EditorField :label="t('gameobjectSpawnEditor.fields.rotation0')" :modified="isFieldModified('rotation0')">
          <InputNumber v-model="form.rotation0" :minFractionDigits="1" :maxFractionDigits="6" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('gameobjectSpawnEditor.fields.rotation1')" :modified="isFieldModified('rotation1')">
          <InputNumber v-model="form.rotation1" :minFractionDigits="1" :maxFractionDigits="6" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('gameobjectSpawnEditor.fields.rotation2')" :modified="isFieldModified('rotation2')">
          <InputNumber v-model="form.rotation2" :minFractionDigits="1" :maxFractionDigits="6" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('gameobjectSpawnEditor.fields.rotation3')" :modified="isFieldModified('rotation3')">
          <InputNumber v-model="form.rotation3" :minFractionDigits="1" :maxFractionDigits="6" :useGrouping="false" fluid />
        </EditorField>
      </div>
    </div>

    <!-- State -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('gameobjectSpawnEditor.groups.state') }}</h4>
        <p>{{ t('gameobjectSpawnEditor.groups.stateDesc') }}</p>
      </div>
      <div class="field-grid">
        <EditorField :label="t('gameobjectSpawnEditor.fields.animprogress')" :modified="isFieldModified('animprogress')">
          <InputNumber v-model="form.animprogress" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('gameobjectSpawnEditor.fields.state')" :modified="isFieldModified('state')">
          <Select v-model="form.state" :options="stateOptions" optionLabel="label" optionValue="value" fluid />
        </EditorField>
      </div>
    </div>

    <!-- Spawn Addon -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('gameobjectSpawnEditor.groups.spawnAddon') }}</h4>
        <p>{{ t('gameobjectSpawnEditor.groups.spawnAddonDesc') }}</p>
      </div>
      <div class="field-grid">
        <EditorField :label="t('gameobjectSpawnEditor.fields.parent_rotation0')" :modified="isAddonModified('parent_rotation0')">
          <InputNumber v-model="addonForm.parent_rotation0" :minFractionDigits="1" :maxFractionDigits="6" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('gameobjectSpawnEditor.fields.parent_rotation1')" :modified="isAddonModified('parent_rotation1')">
          <InputNumber v-model="addonForm.parent_rotation1" :minFractionDigits="1" :maxFractionDigits="6" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('gameobjectSpawnEditor.fields.parent_rotation2')" :modified="isAddonModified('parent_rotation2')">
          <InputNumber v-model="addonForm.parent_rotation2" :minFractionDigits="1" :maxFractionDigits="6" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('gameobjectSpawnEditor.fields.parent_rotation3')" :modified="isAddonModified('parent_rotation3')">
          <InputNumber v-model="addonForm.parent_rotation3" :minFractionDigits="1" :maxFractionDigits="6" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('gameobjectSpawnEditor.fields.invisibilityType')" :tooltip="t('gameobjectSpawnEditor.tooltips.invisibilityType')" :modified="isAddonModified('invisibilityType')">
          <Select v-model="addonForm.invisibilityType" :options="invisibilityTypeOptions" optionLabel="name" optionValue="value" fluid />
        </EditorField>
        <EditorField :label="t('gameobjectSpawnEditor.fields.invisibilityValue')" :tooltip="t('gameobjectSpawnEditor.tooltips.invisibilityValue')" :modified="isAddonModified('invisibilityValue')">
          <InputNumber v-model="addonForm.invisibilityValue" :useGrouping="false" fluid />
        </EditorField>
      </div>
    </div>

    <!-- Script -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('gameobjectSpawnEditor.groups.script') }}</h4>
        <p>{{ t('gameobjectSpawnEditor.groups.scriptDesc') }}</p>
      </div>
      <div class="field-grid">
        <EditorField :label="t('gameobjectSpawnEditor.fields.ScriptName')" :modified="isFieldModified('ScriptName')">
          <InputText v-model="form.ScriptName" fluid />
        </EditorField>
        <EditorField :label="t('gameobjectSpawnEditor.fields.VerifiedBuild')" :modified="isFieldModified('VerifiedBuild')">
          <InputNumber v-model="form.VerifiedBuild" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('gameobjectSpawnEditor.fields.Comment')" :modified="isFieldModified('Comment')" :fullWidth="true">
          <Textarea v-model="(form.Comment as string)" rows="2" fluid />
        </EditorField>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Layout primitives (.field-group, .field-grid) come from src/styles/forms.css. */
</style>
