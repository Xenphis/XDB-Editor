<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import { npc_flags, unit_flags_options, unit_flags2_options, dynamicflags_options, type_flags_options, flags_extra_options, ground_movement_options, swim_movement_options, flight_movement_options, rooted_options, chase_movement_options, random_movement_options, movement_type_options } from '@/modules/npc/types/defines'
import EditorField from '@core/components/EditorField.vue'
import BitmaskField from '@core/components/BitmaskField.vue'
import { useNpcModuleStore } from '@/modules/npc/store'
import { useNpcFieldModifiers } from '@/modules/npc/pages/useNpcFieldModifiers'

const { t } = useI18n()
const store = useNpcModuleStore()
const { isFieldModified, isMovementModified, isAddonModified } = useNpcFieldModifiers()

const form = store.formData
const movementForm = store.movement.newEntry
const addonForm = store.addon.newEntry

const groundOptions = ground_movement_options.map(o => ({ value: o.value, label: o.name }))
const swimOptions = swim_movement_options.map(o => ({ value: o.value, label: o.name }))
const flightOptions = flight_movement_options.map(o => ({ value: o.value, label: o.name }))
const rootedOptions = rooted_options.map(o => ({ value: o.value, label: o.name }))
const chaseOptions = chase_movement_options.map(o => ({ value: o.value, label: o.name }))
const randomOptions = random_movement_options.map(o => ({ value: o.value, label: o.name }))

const movementTypeOptions = movement_type_options.map(o => ({ value: o.value, label: o.name }))
</script>

<template>
  <!-- Flags -->
  <div class="field-group">
    <div class="field-group-header">
      <h4>{{ t('creature_template.groups.flags') }}</h4>
      <p>{{ t('creature_template.groups.flagsDesc') }}</p>
    </div>
    <div class="field-grid">
      <EditorField :label="t('creature_template.fields.npcflag')" :modified="isFieldModified('npcflag')">
        <BitmaskField v-model="form.npcflag" :options="npc_flags" :label="t('creature_template.fields.npcflag')" />
      </EditorField>
      <EditorField :label="t('creature_template.fields.unit_flags')" :modified="isFieldModified('unit_flags')">
        <BitmaskField v-model="form.unit_flags" :options="unit_flags_options" :label="t('creature_template.fields.unit_flags')" />
      </EditorField>
      <EditorField :label="t('creature_template.fields.unit_flags2')" :modified="isFieldModified('unit_flags2')">
        <BitmaskField v-model="form.unit_flags2" :options="unit_flags2_options" :label="t('creature_template.fields.unit_flags2')" />
      </EditorField>
      <EditorField :label="t('creature_template.fields.dynamicflags')" :modified="isFieldModified('dynamicflags')">
        <BitmaskField v-model="form.dynamicflags" :options="dynamicflags_options" :label="t('creature_template.fields.dynamicflags')" />
      </EditorField>
      <EditorField :label="t('creature_template.fields.type_flags')" :modified="isFieldModified('type_flags')">
        <BitmaskField v-model="form.type_flags" :options="type_flags_options" :label="t('creature_template.fields.type_flags')" />
      </EditorField>
      <EditorField :label="t('creature_template.fields.flags_extra')" :modified="isFieldModified('flags_extra')">
        <BitmaskField v-model="form.flags_extra" :options="flags_extra_options" :label="t('creature_template.fields.flags_extra')" />
      </EditorField>
    </div>
  </div>

  <!-- Miscellaneous -->
  <div class="field-group">
    <div class="field-group-header">
      <h4>{{ t('creature_template.groups.miscAdvanced') }}</h4>
      <p>{{ t('creature_template.groups.miscAdvancedDesc') }}</p>
    </div>
    <div class="field-grid">
      <EditorField :label="t('creature_template.fields.HoverHeight')" :modified="isFieldModified('HoverHeight')">
        <InputNumber v-model="form.HoverHeight" :minFractionDigits="1" :maxFractionDigits="5" :useGrouping="false" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.PetSpellDataId')" :modified="isFieldModified('PetSpellDataId')">
        <InputNumber v-model="form.PetSpellDataId" :useGrouping="false" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.StringId')" :modified="isFieldModified('StringId')">
        <InputText v-model="form.StringId" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.VerifiedBuild')" :modified="isFieldModified('VerifiedBuild')">
        <InputNumber v-model="form.VerifiedBuild" :useGrouping="false" fluid />
      </EditorField>
    </div>
  </div>

  <!-- Movement -->
  <div class="field-group">
    <div class="field-group-header">
      <h4>{{ t('creature_template.groups.movement') }}</h4>
      <p>{{ t('creature_template.groups.movementDesc') }}</p>
    </div>
    <div class="field-grid">
      <EditorField :label="t('creature_template.fields.movementId')" :modified="isFieldModified('movementId')">
        <InputNumber v-model="form.movementId" :useGrouping="false" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.MovementType')" :modified="isFieldModified('MovementType')">
        <Select v-model="form.MovementType" :options="movementTypeOptions" optionLabel="label" optionValue="value" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.speed_walk')" :modified="isFieldModified('speed_walk')">
        <InputNumber v-model="form.speed_walk" :minFractionDigits="1" :maxFractionDigits="5" :useGrouping="false" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.speed_run')" :modified="isFieldModified('speed_run')">
        <InputNumber v-model="form.speed_run" :minFractionDigits="1" :maxFractionDigits="5" :useGrouping="false" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.addon_path_id')" :modified="isAddonModified('path_id')">
        <InputNumber v-model="addonForm.path_id" :useGrouping="false" fluid />
      </EditorField>
    </div>
  </div>

  <!-- Movement Details (creature_template_movement) -->
  <div class="field-group">
    <div class="field-group-header">
      <h4>{{ t('creature_template.groups.movementDetails') }}</h4>
      <p>{{ t('creature_template.groups.movementDetailsDesc') }}</p>
    </div>
    <div class="field-grid">
      <EditorField :label="t('creature_template.fields.movement_ground')" :modified="isMovementModified('Ground')">
        <Select v-model="movementForm.Ground" :options="groundOptions" optionLabel="label" optionValue="value" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.movement_swim')" :modified="isMovementModified('Swim')">
        <Select v-model="movementForm.Swim" :options="swimOptions" optionLabel="label" optionValue="value" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.movement_flight')" :modified="isMovementModified('Flight')">
        <Select v-model="movementForm.Flight" :options="flightOptions" optionLabel="label" optionValue="value" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.movement_rooted')" :modified="isMovementModified('Rooted')">
        <Select v-model="movementForm.Rooted" :options="rootedOptions" optionLabel="label" optionValue="value" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.movement_chase')" :modified="isMovementModified('Chase')">
        <Select v-model="movementForm.Chase" :options="chaseOptions" optionLabel="label" optionValue="value" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.movement_random')" :modified="isMovementModified('Random')">
        <Select v-model="movementForm.Random" :options="randomOptions" optionLabel="label" optionValue="value" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.movement_interaction_pause')" :modified="isMovementModified('InteractionPauseTimer')">
        <InputNumber v-model="movementForm.InteractionPauseTimer" :useGrouping="false" fluid />
      </EditorField>
    </div>
  </div>
</template>

<style scoped>
@import '../npc-editor.css';
</style>
