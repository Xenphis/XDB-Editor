<script setup lang="ts">
import { ref, reactive, onMounted, computed, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import EditorHeader from '@core/components/EditorHeader.vue'
import SectionTabs, { type SectionTabItem } from '@core/components/SectionTabs.vue'
import type { FieldChange } from '@core/composables/useQueryGenerator'
import type { Creature } from '@/modules/npc/types/creature/creature'
import { useCreatureEnumOptions } from '@/modules/npc/composables/useCreatureEnumOptions'
import { getByte, setByte } from '@/modules/npc/composables/bytesFields'
import type { CreatureAddon } from '@/modules/npc/types/creature/creature_addon'
import type { CreatureMovementOverride } from '@/modules/npc/types/creature/creature_movement_override'
import type { CreatureFormationMember } from '@/modules/npc/types/misc/creature_formations'
import { getCreatureSpawns, getCreatureAddon, getCreatureMovementOverride, getCreatureFormationOfMember } from '@/modules/npc/service'
import { useQueryGenerator } from '@core/composables/useQueryGenerator'
import BitmaskField from '@core/components/BitmaskField.vue'
import EditorField from '@core/components/EditorField.vue'

/** Shared reactive state pushed up to the workspace inspector (SQL + diff). */
export interface SpawnInspectorState {
  diffQuery: string
  fullQuery: string
  hasChanges: boolean
  changedFields: FieldChange[]
}

const { t } = useI18n()
const router = useRouter()

const {
  movementTypeOptions,
  spawnMaskOptions,
  standStateOptions,
  animTierOptions,
  visFlagsOptions,
  sheathStateOptions,
  pvpFlagsOptions,
  npcFlags,
  unitFlagsOptions,
  dynamicflagsOptions,
  visibilityDistanceOptions: visDistanceOptions,
  groundMovementOptions: movrGroundOptions,
  swimMovementOptions: movrSwimOptions,
  flightMovementOptions: movrFlightOptions,
  rootedOptions: movrRootedOptions,
  chaseMovementOptions: movrChaseOptions,
  randomMovementOptions: movrRandomOptions,
} = useCreatureEnumOptions()

const props = defineProps<{
  spawnGuid: number
  npcEntry: number
  /** Optional reactive sink so the workspace right rail can show spawn SQL. */
  inspector?: SpawnInspectorState
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: Creature): void
}>()

const loading = ref(false)

const form = reactive<Creature>({
  guid: 0,
  id1: 0,
  id2: 0,
  id3: 0,
  map: 0,
  zoneId: 0,
  areaId: 0,
  spawnMask: 1,
  phaseMask: 1,
  equipment_id: 0,
  position_x: 0,
  position_y: 0,
  position_z: 0,
  orientation: 0,
  spawntimesecs: 300,
  wander_distance: 0,
  currentwaypoint: 0,
  curhealth: 1,
  curmana: 0,
  MovementType: 0,
  npcflag: 0,
  unit_flags: 0,
  dynamicflags: 0,
  ScriptName: '',
  VerifiedBuild: null,
  CreateObject: 0,
  Comment: null,
})

const originalValue = ref<Creature | null>(null)

// --- Creature Addon ---
const addonForm = reactive<CreatureAddon>({
  guid: 0,
  path_id: 0,
  mount: 0,
  bytes1: 0,
  bytes2: 0,
  emote: 0,
  visibilityDistanceType: 0,
  auras: null,
})

// bytes1 = StandState (byte 0) / unused (byte 1) / VisFlags (byte 2) / AnimTier (byte 3)
// bytes2 = SheathState (byte 0) / PvPFlags (byte 1) / unused (bytes 2-3)
const addonStandState = computed({
  get: () => getByte(addonForm.bytes1, 0),
  set: (v: number) => { addonForm.bytes1 = setByte(addonForm.bytes1, 0, v) },
})
const addonAnimTier = computed({
  get: () => getByte(addonForm.bytes1, 3),
  set: (v: number) => { addonForm.bytes1 = setByte(addonForm.bytes1, 3, v) },
})
const addonVisFlags = computed({
  get: () => getByte(addonForm.bytes1, 2),
  set: (v: number) => { addonForm.bytes1 = setByte(addonForm.bytes1, 2, v) },
})
const addonSheathState = computed({
  get: () => getByte(addonForm.bytes2, 0),
  set: (v: number) => { addonForm.bytes2 = setByte(addonForm.bytes2, 0, v) },
})
const addonPvpFlags = computed({
  get: () => getByte(addonForm.bytes2, 1),
  set: (v: number) => { addonForm.bytes2 = setByte(addonForm.bytes2, 1, v) },
})

const originalAddon = ref<CreatureAddon | null>(null)

const {
  diffQuery: addonDiffQuery,
  hasChanges: addonHasChanges,
  changedFields: addonChangedFields,
} = useQueryGenerator<CreatureAddon>(
  'creature_addon',
  'guid',
  originalAddon,
  addonForm,
)

const addonModifiedFieldSet = computed(() => new Set(addonChangedFields.value.map(c => c.field)))

function isAddonFieldModified(field: string): boolean {
  return addonModifiedFieldSet.value.has(field)
}

// --- Creature Movement Override ---
const movementOverrideForm = reactive<CreatureMovementOverride>({
  SpawnId: 0,
  Ground: undefined,
  Swim: undefined,
  Flight: undefined,
  Rooted: undefined,
  Chase: undefined,
  Random: undefined,
  InteractionPauseTimer: undefined,
})

const originalMovementOverride = ref<CreatureMovementOverride | null>(null)

const {
  diffQuery: movementOverrideDiffQuery,
  hasChanges: movementOverrideHasChanges,
  changedFields: movementOverrideChangedFields,
} = useQueryGenerator<CreatureMovementOverride>(
  'creature_movement_override',
  'SpawnId',
  originalMovementOverride,
  movementOverrideForm,
)

const movementOverrideModifiedFieldSet = computed(() => new Set(movementOverrideChangedFields.value.map(c => c.field)))

function isMovementOverrideFieldModified(field: string): boolean {
  return movementOverrideModifiedFieldSet.value.has(field)
}

const { diffQuery, fullQuery, hasChanges, changedFields } = useQueryGenerator<Creature>(
  'creature',
  'guid',
  originalValue,
  form,
)

const combinedDiffQuery = computed(() => {
  const parts: string[] = []
  if (diffQuery.value) parts.push(diffQuery.value)
  if (addonDiffQuery.value) parts.push(addonDiffQuery.value)
  if (movementOverrideDiffQuery.value) parts.push(movementOverrideDiffQuery.value)
  return parts.join('\n')
})

const combinedHasChanges = computed(() =>
  hasChanges.value || addonHasChanges.value || movementOverrideHasChanges.value
)

const combinedChangedFields = computed(() => [
  ...changedFields.value,
  ...addonChangedFields.value,
  ...movementOverrideChangedFields.value,
])

const modifiedFieldSet = computed(() => new Set(changedFields.value.map(c => c.field)))

function isFieldModified(field: string): boolean {
  return modifiedFieldSet.value.has(field)
}

// Mirror the spawn's SQL/diff into the workspace inspector (right rail).
watchEffect(() => {
  if (!props.inspector) return
  props.inspector.diffQuery = combinedDiffQuery.value
  props.inspector.fullQuery = fullQuery.value
  props.inspector.hasChanges = combinedHasChanges.value
  props.inspector.changedFields = combinedChangedFields.value
})

const mainTabs = computed<SectionTabItem[]>(() => [
  { value: 'general', label: t('creature.tabs.general') },
  { value: 'movement', label: t('creature.tabs.position') },
  { value: 'behavior', label: t('creature.tabs.advanced') },
  { value: 'addon', label: t('creature.tabs.addon') },
])

function onDiscard() {
  if (originalValue.value) Object.assign(form, originalValue.value)
  if (originalAddon.value) Object.assign(addonForm, originalAddon.value)
  if (originalMovementOverride.value) Object.assign(movementOverrideForm, originalMovementOverride.value)
}

function onSave() {
  emit('save', { ...form })
}

// --- Formation membership (read-only; edited in the formation module) ---
const formation = ref<CreatureFormationMember | null>(null)

const isFormationLeader = computed(() =>
  formation.value != null && formation.value.leaderGUID === formation.value.memberGUID)

function openFormation() {
  if (!formation.value) return
  router.push(`/npc/formation/${formation.value.leaderGUID}`)
}

onMounted(async () => {
  loading.value = true
  try {
    const spawns = await getCreatureSpawns(props.npcEntry)
    const spawn = spawns.find(s => s.guid === props.spawnGuid)
    if (spawn) {
      Object.assign(form, spawn)
      originalValue.value = { ...spawn }
    }
  } catch (e) {
    console.error('Failed to load spawn:', e)
  } finally {
    loading.value = false
  }

  try {
    const addon = await getCreatureAddon(props.spawnGuid)
    if (addon) {
      Object.assign(addonForm, addon)
      originalAddon.value = { ...addon }
    } else {
      addonForm.guid = props.spawnGuid
      originalAddon.value = { ...addonForm }
    }
  } catch (e) {
    console.error('Failed to load creature addon:', e)
  }

  try {
    const movOverride = await getCreatureMovementOverride(props.spawnGuid)
    if (movOverride) {
      Object.assign(movementOverrideForm, movOverride)
      originalMovementOverride.value = { ...movOverride }
    } else {
      movementOverrideForm.SpawnId = props.spawnGuid
      originalMovementOverride.value = { ...movementOverrideForm }
    }
  } catch (e) {
    console.error('Failed to load creature movement override:', e)
  }

  try {
    formation.value = await getCreatureFormationOfMember(props.spawnGuid)
  } catch (e) {
    console.error('Failed to load creature formation:', e)
  }
})
</script>

<template>
  <div class="spawn-editor">
    <!-- Header -->
    <EditorHeader
      :subtitle="t('creature.editorTitle')"
      :id="form.guid"
      table="creature"
      :backLabel="t('creature.back')"
      :hasChanges="combinedHasChanges"
      :discardLabel="t('creature.discard')"
      :executeLabel="t('creature.save')"
      @back="emit('close')"
      @discard="onDiscard"
      @execute="onSave"
    />

    <!-- Tabs -->
    <SectionTabs :tabs="mainTabs" variant="plain" defaultValue="general">
        <!-- ==================== GENERAL ==================== -->
        <template #general>
          <!-- Identification -->
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('creature.groups.identification') }}</h4>
              <p>{{ t('creature.groups.identificationDesc') }}</p>
            </div>
            <div class="field-grid">
              <EditorField :label="t('creature.fields.guid')" :tooltip="t('creature.tooltips.guid')" :modified="isFieldModified('guid')">
                <InputNumber v-model="form.guid" :useGrouping="false" fluid disabled />
              </EditorField>
              <EditorField :label="t('creature.fields.id1')" :tooltip="t('creature.tooltips.id1')" :modified="isFieldModified('id1')">
                <InputNumber v-model="form.id1" :useGrouping="false" fluid />
              </EditorField>
              <EditorField :label="t('creature.fields.id2')" :tooltip="t('creature.tooltips.id2')" :modified="isFieldModified('id2')">
                <InputNumber v-model="form.id2" :useGrouping="false" fluid />
              </EditorField>
              <EditorField :label="t('creature.fields.id3')" :tooltip="t('creature.tooltips.id3')" :modified="isFieldModified('id3')">
                <InputNumber v-model="form.id3" :useGrouping="false" fluid />
              </EditorField>
            </div>
          </div>

          <!-- Position -->
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('creature.groups.position') }}</h4>
              <p>{{ t('creature.groups.positionDesc') }}</p>
            </div>
            <div class="field-grid">
              <EditorField :label="t('creature.fields.map')" :tooltip="t('creature.tooltips.map')" :modified="isFieldModified('map')">
                <InputNumber v-model="form.map" :useGrouping="false" fluid />
              </EditorField>
              <EditorField :label="t('creature.fields.zoneId')" :tooltip="t('creature.tooltips.zoneId')" :modified="isFieldModified('zoneId')">
                <InputNumber v-model="form.zoneId" :useGrouping="false" fluid />
              </EditorField>
              <EditorField :label="t('creature.fields.areaId')" :tooltip="t('creature.tooltips.areaId')" :modified="isFieldModified('areaId')">
                <InputNumber v-model="form.areaId" :useGrouping="false" fluid />
              </EditorField>
              <EditorField :label="t('creature.fields.position_x')" :tooltip="t('creature.tooltips.position_x')" :modified="isFieldModified('position_x')">
                <InputNumber v-model="form.position_x" :minFractionDigits="1" :maxFractionDigits="6" :useGrouping="false" fluid />
              </EditorField>
              <EditorField :label="t('creature.fields.position_y')" :tooltip="t('creature.tooltips.position_y')" :modified="isFieldModified('position_y')">
                <InputNumber v-model="form.position_y" :minFractionDigits="1" :maxFractionDigits="6" :useGrouping="false" fluid />
              </EditorField>
              <EditorField :label="t('creature.fields.position_z')" :tooltip="t('creature.tooltips.position_z')" :modified="isFieldModified('position_z')">
                <InputNumber v-model="form.position_z" :minFractionDigits="1" :maxFractionDigits="6" :useGrouping="false" fluid />
              </EditorField>
              <EditorField :label="t('creature.fields.orientation')" :tooltip="t('creature.tooltips.orientation')" :modified="isFieldModified('orientation')">
                <InputNumber v-model="form.orientation" :minFractionDigits="1" :maxFractionDigits="6" :useGrouping="false" fluid />
              </EditorField>
            </div>
          </div>

          <!-- Spawn Settings -->
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('creature.groups.spawnSettings') }}</h4>
              <p>{{ t('creature.groups.spawnSettingsDesc') }}</p>
            </div>
            <div class="field-grid">
              <EditorField :label="t('creature.fields.spawnMask')" :tooltip="t('creature.tooltips.spawnMask')" :modified="isFieldModified('spawnMask')">
                <BitmaskField v-model="form.spawnMask" :options="spawnMaskOptions" :label="t('creature.fields.spawnMask')" />
              </EditorField>
              <EditorField :label="t('creature.fields.phaseMask')" :tooltip="t('creature.tooltips.phaseMask')" :modified="isFieldModified('phaseMask')">
                <InputNumber v-model="form.phaseMask" :useGrouping="false" fluid />
              </EditorField>
              <EditorField :label="t('creature.fields.spawntimesecs')" :tooltip="t('creature.tooltips.spawntimesecs')" :modified="isFieldModified('spawntimesecs')">
                <InputNumber v-model="form.spawntimesecs" :useGrouping="false" fluid />
              </EditorField>
              <EditorField :label="t('creature.fields.CreateObject')" :tooltip="t('creature.tooltips.CreateObject')" :modified="isFieldModified('CreateObject')">
                <InputNumber v-model="form.CreateObject" :useGrouping="false" fluid />
              </EditorField>
              <EditorField :label="t('creature.fields.addon_visdistance')" :modified="isAddonFieldModified('visibilityDistanceType')">
                <Select v-model="addonForm.visibilityDistanceType" :options="visDistanceOptions" optionLabel="name" optionValue="value" fluid />
              </EditorField>
            </div>
          </div>

          <!-- Current State -->
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('creature.groups.currentState') }}</h4>
              <p>{{ t('creature.groups.currentStateDesc') }}</p>
            </div>
            <div class="field-grid">
              <EditorField :label="t('creature.fields.curhealth')" :tooltip="t('creature.tooltips.curhealth')" :modified="isFieldModified('curhealth')">
                <InputNumber v-model="form.curhealth" :useGrouping="false" fluid />
              </EditorField>
              <EditorField :label="t('creature.fields.curmana')" :tooltip="t('creature.tooltips.curmana')" :modified="isFieldModified('curmana')">
                <InputNumber v-model="form.curmana" :useGrouping="false" fluid />
              </EditorField>
            </div>
          </div>
        </template>

        <!-- ==================== MOVEMENT ==================== -->
        <template #movement>
          <!-- Movement -->
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('creature.groups.movement') }}</h4>
              <p>{{ t('creature.groups.movementDesc') }}</p>
            </div>
            <div class="field-grid">
              <EditorField :label="t('creature.fields.MovementType')" :tooltip="t('creature.tooltips.MovementType')" :modified="isFieldModified('MovementType')">
                <Select v-model="form.MovementType" :options="movementTypeOptions" optionLabel="name" optionValue="value" fluid />
              </EditorField>
              <EditorField :label="t('creature.fields.wander_distance')" :tooltip="t('creature.tooltips.wander_distance')" :modified="isFieldModified('wander_distance')">
                <InputNumber v-model="form.wander_distance" :minFractionDigits="1" :maxFractionDigits="5" :useGrouping="false" fluid />
              </EditorField>
              <EditorField :label="t('creature.fields.currentwaypoint')" :tooltip="t('creature.tooltips.currentwaypoint')" :modified="isFieldModified('currentwaypoint')">
                <InputNumber v-model="form.currentwaypoint" :useGrouping="false" fluid />
              </EditorField>
              <EditorField :label="t('creature.fields.addon_path_id')" :modified="isAddonFieldModified('path_id')">
                <InputNumber v-model="addonForm.path_id" :useGrouping="false" fluid />
              </EditorField>
            </div>
          </div>

          <!-- Movement Override -->
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('creature.groups.movementOverride') }}</h4>
              <p>{{ t('creature.groups.movementOverrideDesc') }}</p>
            </div>
            <div class="field-grid">
              <EditorField :label="t('creature.fields.movr_ground')" :modified="isMovementOverrideFieldModified('Ground')">
                <Select v-model="movementOverrideForm.Ground" :options="movrGroundOptions" optionLabel="name" optionValue="value" fluid />
              </EditorField>
              <EditorField :label="t('creature.fields.movr_swim')" :modified="isMovementOverrideFieldModified('Swim')">
                <Select v-model="movementOverrideForm.Swim" :options="movrSwimOptions" optionLabel="name" optionValue="value" fluid />
              </EditorField>
              <EditorField :label="t('creature.fields.movr_flight')" :modified="isMovementOverrideFieldModified('Flight')">
                <Select v-model="movementOverrideForm.Flight" :options="movrFlightOptions" optionLabel="name" optionValue="value" fluid />
              </EditorField>
              <EditorField :label="t('creature.fields.movr_rooted')" :modified="isMovementOverrideFieldModified('Rooted')">
                <Select v-model="movementOverrideForm.Rooted" :options="movrRootedOptions" optionLabel="name" optionValue="value" fluid />
              </EditorField>
              <EditorField :label="t('creature.fields.movr_chase')" :modified="isMovementOverrideFieldModified('Chase')">
                <Select v-model="movementOverrideForm.Chase" :options="movrChaseOptions" optionLabel="name" optionValue="value" fluid />
              </EditorField>
              <EditorField :label="t('creature.fields.movr_random')" :modified="isMovementOverrideFieldModified('Random')">
                <Select v-model="movementOverrideForm.Random" :options="movrRandomOptions" optionLabel="name" optionValue="value" fluid />
              </EditorField>
              <EditorField :label="t('creature.fields.movr_interaction_pause')" :modified="isMovementOverrideFieldModified('InteractionPauseTimer')">
                <InputNumber v-model="movementOverrideForm.InteractionPauseTimer" :useGrouping="false" fluid />
              </EditorField>
            </div>
          </div>
        </template>

        <!-- ==================== BEHAVIOR ==================== -->
        <template #behavior>
          <!-- Formation (read-only: edited in the formation module) -->
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('creature.groups.formation') }}</h4>
              <p>{{ t('creature.groups.formationDesc') }}</p>
            </div>
            <div v-if="formation" class="formation-status">
              <div class="formation-status-text">
                <span class="formation-badge" :class="{ 'is-leader': isFormationLeader }">
                  <i :class="isFormationLeader ? 'pi pi-flag' : 'pi pi-sitemap'"></i>
                  {{ isFormationLeader ? t('creature.formation.asLeader') : t('creature.formation.asMember') }}
                </span>
                <span class="formation-detail">
                  {{ t('creature.formation.leaderLabel', { guid: formation.leaderGUID, name: formation.name ?? '—' }) }}
                  <template v-if="!isFormationLeader">
                    · {{ t('creature.formation.placement', { dist: formation.dist, angle: formation.angle }) }}
                  </template>
                </span>
              </div>
              <Button
                icon="pi pi-external-link"
                severity="secondary"
                size="small"
                outlined
                :label="t('creature.formation.open')"
                @click="openFormation"
              />
            </div>
            <p v-else class="formation-none">{{ t('creature.formation.none') }}</p>
          </div>

          <!-- Animation -->
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('creature.groups.animation') }}</h4>
              <p>{{ t('creature.groups.animationDesc') }}</p>
            </div>
            <div class="field-grid">
              <EditorField :label="t('creature.fields.addon_standstate')" :modified="isAddonFieldModified('bytes1')">
                <Select v-model="addonStandState" :options="standStateOptions" optionLabel="name" optionValue="value" fluid />
              </EditorField>
              <EditorField :label="t('creature.fields.addon_animtier')" :modified="isAddonFieldModified('bytes1')">
                <Select v-model="addonAnimTier" :options="animTierOptions" optionLabel="name" optionValue="value" fluid />
              </EditorField>
              <EditorField :label="t('creature.fields.addon_sheathstate')" :modified="isAddonFieldModified('bytes2')">
                <Select v-model="addonSheathState" :options="sheathStateOptions" optionLabel="name" optionValue="value" fluid />
              </EditorField>
              <EditorField :label="t('creature.fields.addon_emote')" :modified="isAddonFieldModified('emote')">
                <InputNumber v-model="addonForm.emote" :useGrouping="false" fluid />
              </EditorField>
            </div>
          </div>

          <!-- Flags -->
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('creature.groups.flags') }}</h4>
              <p>{{ t('creature.groups.flagsDesc') }}</p>
            </div>
            <div class="field-grid">
              <EditorField :label="t('creature.fields.npcflag')" :tooltip="t('creature.tooltips.npcflag')" :modified="isFieldModified('npcflag')">
                <BitmaskField v-model="form.npcflag" :options="npcFlags" :label="t('creature.fields.npcflag')" />
              </EditorField>
              <EditorField :label="t('creature.fields.unit_flags')" :tooltip="t('creature.tooltips.unit_flags')" :modified="isFieldModified('unit_flags')">
                <BitmaskField v-model="form.unit_flags" :options="unitFlagsOptions" :label="t('creature.fields.unit_flags')" />
              </EditorField>
              <EditorField :label="t('creature.fields.dynamicflags')" :tooltip="t('creature.tooltips.dynamicflags')" :modified="isFieldModified('dynamicflags')">
                <BitmaskField v-model="form.dynamicflags" :options="dynamicflagsOptions" :label="t('creature.fields.dynamicflags')" />
              </EditorField>
              <EditorField :label="t('creature.fields.addon_visflags')" :modified="isAddonFieldModified('bytes1')">
                <BitmaskField v-model="addonVisFlags" :options="visFlagsOptions" :label="t('creature.fields.addon_visflags')" />
              </EditorField>
              <EditorField :label="t('creature.fields.addon_pvpflags')" :modified="isAddonFieldModified('bytes2')">
                <BitmaskField v-model="addonPvpFlags" :options="pvpFlagsOptions" :label="t('creature.fields.addon_pvpflags')" />
              </EditorField>
            </div>
          </div>

          <!-- Script -->
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('creature.groups.script') }}</h4>
              <p>{{ t('creature.groups.scriptDesc') }}</p>
            </div>
            <div class="field-grid">
              <EditorField :label="t('creature.fields.ScriptName')" :tooltip="t('creature.tooltips.ScriptName')" :modified="isFieldModified('ScriptName')">
                <InputText v-model="form.ScriptName" fluid />
              </EditorField>
              <EditorField :label="t('creature.fields.VerifiedBuild')" :tooltip="t('creature.tooltips.VerifiedBuild')" :modified="isFieldModified('VerifiedBuild')">
                <InputNumber v-model="form.VerifiedBuild" :useGrouping="false" fluid />
              </EditorField>
              <EditorField :label="t('creature.fields.Comment')" :tooltip="t('creature.tooltips.Comment')" :modified="isFieldModified('Comment')" fullWidth>
                <InputText v-model="form.Comment" fluid />
              </EditorField>
            </div>
          </div>
        </template>

        <!-- ==================== ADDON ==================== -->
        <template #addon>
          <!-- Creature Addon -->
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('creature.groups.creatureAddon') }}</h4>
              <p>{{ t('creature.groups.creatureAddonDesc') }}</p>
            </div>
            <div class="field-grid">
              <EditorField :label="t('creature.fields.addon_mount')" :modified="isAddonFieldModified('mount')">
                <InputNumber v-model="addonForm.mount" :useGrouping="false" fluid />
              </EditorField>
            </div>
          </div>

          <!-- Auras -->
          <div class="field-group">
            <div class="field-group-header">
              <h4>{{ t('creature.groups.aura') }}</h4>
              <p>{{ t('creature.groups.auraDesc') }}</p>
            </div>
            <div class="field-grid">
              <EditorField :label="t('creature.fields.addon_auras')" :modified="isAddonFieldModified('auras')" fullWidth>
                <InputText v-model="addonForm.auras" fluid />
              </EditorField>
            </div>
          </div>
        </template>
    </SectionTabs>
  </div>
</template>

<style scoped>
/* Layout primitives (.field-group, .field-grid) come from src/styles/forms.css. */

.formation-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.formation-status-text {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  font-size: var(--font-field);
}

.formation-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius);
  background: var(--surface-strong);
  color: var(--text-soft);
  font-size: var(--font-label);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.formation-badge.is-leader {
  background: var(--accent-ring);
  color: var(--accent);
}

.formation-detail {
  color: var(--text-muted);
}

.formation-none {
  margin: 0;
  font-size: var(--font-field);
  color: var(--text-muted);
}
</style>
