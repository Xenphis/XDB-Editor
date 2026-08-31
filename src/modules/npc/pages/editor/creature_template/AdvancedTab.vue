<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import { useCreatureEnumOptions } from '@/modules/npc/composables/useCreatureEnumOptions'
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

const {
  npcFlags,
  unitFlagsOptions,
  unitFlags2Options,
  dynamicflagsOptions,
  typeFlagsOptions,
  flagsExtraOptions,
  groundMovementOptions: groundOptions,
  swimMovementOptions: swimOptions,
  flightMovementOptions: flightOptions,
  rootedOptions,
  chaseMovementOptions: chaseOptions,
  randomMovementOptions: randomOptions,
  movementTypeOptions,
} = useCreatureEnumOptions()
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
        <BitmaskField v-model="form.npcflag" :options="npcFlags" :label="t('creature_template.fields.npcflag')" />
      </EditorField>
      <EditorField :label="t('creature_template.fields.unit_flags')" :modified="isFieldModified('unit_flags')">
        <BitmaskField v-model="form.unit_flags" :options="unitFlagsOptions" :label="t('creature_template.fields.unit_flags')" />
      </EditorField>
      <EditorField :label="t('creature_template.fields.unit_flags2')" :modified="isFieldModified('unit_flags2')">
        <BitmaskField v-model="form.unit_flags2" :options="unitFlags2Options" :label="t('creature_template.fields.unit_flags2')" />
      </EditorField>
      <EditorField :label="t('creature_template.fields.dynamicflags')" :modified="isFieldModified('dynamicflags')">
        <BitmaskField v-model="form.dynamicflags" :options="dynamicflagsOptions" :label="t('creature_template.fields.dynamicflags')" />
      </EditorField>
      <EditorField :label="t('creature_template.fields.type_flags')" :modified="isFieldModified('type_flags')">
        <BitmaskField v-model="form.type_flags" :options="typeFlagsOptions" :label="t('creature_template.fields.type_flags')" />
      </EditorField>
      <EditorField :label="t('creature_template.fields.flags_extra')" :modified="isFieldModified('flags_extra')">
        <BitmaskField v-model="form.flags_extra" :options="flagsExtraOptions" :label="t('creature_template.fields.flags_extra')" />
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
        <Select v-model="form.MovementType" :options="movementTypeOptions" optionLabel="name" optionValue="value" fluid />
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
        <Select v-model="movementForm.Ground" :options="groundOptions" optionLabel="name" optionValue="value" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.movement_swim')" :modified="isMovementModified('Swim')">
        <Select v-model="movementForm.Swim" :options="swimOptions" optionLabel="name" optionValue="value" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.movement_flight')" :modified="isMovementModified('Flight')">
        <Select v-model="movementForm.Flight" :options="flightOptions" optionLabel="name" optionValue="value" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.movement_rooted')" :modified="isMovementModified('Rooted')">
        <Select v-model="movementForm.Rooted" :options="rootedOptions" optionLabel="name" optionValue="value" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.movement_chase')" :modified="isMovementModified('Chase')">
        <Select v-model="movementForm.Chase" :options="chaseOptions" optionLabel="name" optionValue="value" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.movement_random')" :modified="isMovementModified('Random')">
        <Select v-model="movementForm.Random" :options="randomOptions" optionLabel="name" optionValue="value" fluid />
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
