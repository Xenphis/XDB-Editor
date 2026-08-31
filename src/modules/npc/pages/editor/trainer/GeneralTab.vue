<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import EditorField from '@core/components/EditorField.vue'
import { useTrainerStore } from '@/modules/npc/stores/trainerStore'
import { useTrainerFieldModifiers } from '@/modules/npc/pages/useTrainerFieldModifiers'

const { t } = useI18n()
const store = useTrainerStore()
const { isFieldModified } = useTrainerFieldModifiers()

const form = store.formData

const typeOptions = [
  { value: 0, label: t('trainer.types.class') },
  { value: 1, label: t('trainer.types.mount') },
  { value: 2, label: t('trainer.types.tradeskill') },
  { value: 3, label: t('trainer.types.pet') },
]

const requirementLabel = computed(() => {
  if (form.Type === 0) return t('trainer.fields.requirementClass')
  return t('trainer.fields.requirement')
})
</script>

<template>
  <!-- Identification -->
  <div class="field-group">
    <div class="field-group-header">
      <h4>{{ t('trainer.groups.identification') }}</h4>
      <p>{{ t('trainer.groups.identificationDesc') }}</p>
    </div>
    <div class="field-grid">
      <EditorField :label="t('trainer.fields.id')" :modified="isFieldModified('Id')">
        <InputNumber v-model="form.Id" :useGrouping="false" :disabled="store.editingId != null" fluid />
      </EditorField>
      <EditorField :label="t('trainer.fields.type')" :modified="isFieldModified('Type')">
        <Select v-model="form.Type" :options="typeOptions" optionLabel="label" optionValue="value" fluid />
      </EditorField>
      <EditorField :label="requirementLabel" :modified="isFieldModified('Requirement')" :tooltip="t('trainer.tooltips.requirement')">
        <InputNumber v-model="form.Requirement" :useGrouping="false" fluid />
      </EditorField>
    </div>
  </div>

  <!-- Greeting -->
  <div class="field-group">
    <div class="field-group-header">
      <h4>{{ t('trainer.groups.greeting') }}</h4>
      <p>{{ t('trainer.groups.greetingDesc') }}</p>
    </div>
    <div class="field-grid">
      <EditorField :label="t('trainer.fields.greeting')" :modified="isFieldModified('Greeting')" :fullWidth="true">
        <InputText v-model="form.Greeting" fluid />
      </EditorField>
    </div>
  </div>

  <!-- Miscellaneous -->
  <div class="field-group">
    <div class="field-group-header">
      <h4>{{ t('trainer.groups.misc') }}</h4>
      <p>{{ t('trainer.groups.miscDesc') }}</p>
    </div>
    <div class="field-grid">
      <EditorField :label="t('trainer.fields.verifiedBuild')" :modified="isFieldModified('VerifiedBuild')">
        <InputNumber v-model="form.VerifiedBuild" :useGrouping="false" fluid />
      </EditorField>
    </div>
  </div>
</template>

<style scoped>
@import '../npc-editor.css';
</style>
