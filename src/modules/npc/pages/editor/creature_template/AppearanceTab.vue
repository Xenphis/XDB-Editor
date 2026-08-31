<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Button from 'primevue/button'
import { vis_flags_options, stand_state_types, anim_tier_types, visibility_distance_options } from '@/modules/npc/types/defines'
import EditorField from '@core/components/EditorField.vue'
import BitmaskField from '@core/components/BitmaskField.vue'
import EditableDataTable, { type ColumnDef } from '@core/components/EditableDataTable.vue'
import ModelSearchDialog from '@/modules/model_search/components/ModelSearchDialog.vue'
import { useNpcModuleStore } from '@/modules/npc/store'
import { useNpcFieldModifiers } from '@/modules/npc/pages/useNpcFieldModifiers'

const { t } = useI18n()
const store = useNpcModuleStore()
const { isFieldModified, isAddonModified } = useNpcFieldModifiers()

const form = store.formData
const addonForm = store.addon.newEntry
const equipEntries = computed(() => store.equips.getNewEntries())

// --- Model search (picker dialog for the modelid fields) ---
type ModelIdField = 'modelid1' | 'modelid2' | 'modelid3' | 'modelid4'
const modelDialogVisible = ref(false)
const modelTargetField = ref<ModelIdField>('modelid1')
function openModelSearch(field: ModelIdField) {
  modelTargetField.value = field
  modelDialogVisible.value = true
}
function onModelSelect(displayId: number) {
  form[modelTargetField.value] = displayId
}

const standStateOptions = stand_state_types.map(o => ({ value: o.value, label: o.name }))
const animTierOptions = anim_tier_types.map(o => ({ value: o.value, label: o.name }))
const visDistOptions = visibility_distance_options.map(o => ({ value: o.value, label: o.name }))

const equipHasChanges = computed(() => store.equips.getSqlDiff(form.entry).length > 0)

const equipColumns: ColumnDef[] = [
  { field: 'ID', header: 'Set', type: 'readonly', width: '5rem' },
  { field: 'ItemID1', header: t('creature_template.fields.equip_itemid1'), type: 'number' },
  { field: 'ItemID2', header: t('creature_template.fields.equip_itemid2'), type: 'number' },
  { field: 'ItemID3', header: t('creature_template.fields.equip_itemid3'), type: 'number' },
]

function addEquipSet() {
  const nextId = equipEntries.value.length > 0 ? Math.max(...equipEntries.value.map(e => e.ID)) + 1 : 1
  store.equips.pushNewEntry({ ID: nextId, ItemID1: 0, ItemID2: 0, ItemID3: 0 })
}

function removeEquip(index: number) {
  store.equips.removeNewEntry(index)
}
</script>

<template>
  <!-- Model & Display -->
  <div class="field-group">
    <div class="field-group-header">
      <h4>{{ t('creature_template.groups.modelDisplay') }}</h4>
      <p>{{ t('creature_template.groups.modelDisplayDesc') }}</p>
    </div>
    <div class="field-grid">
      <EditorField :label="t('creature_template.fields.modelid1')" :modified="isFieldModified('modelid1')">
        <div class="model-field">
          <InputNumber v-model="form.modelid1" :useGrouping="false" fluid />
          <Button type="button" icon="pi pi-search" severity="secondary" class="model-search-btn" v-tooltip.bottom="t('modelSearch.searchTooltip')" @click="openModelSearch('modelid1')" />
        </div>
      </EditorField>
      <EditorField :label="t('creature_template.fields.modelid2')" :modified="isFieldModified('modelid2')">
        <div class="model-field">
          <InputNumber v-model="form.modelid2" :useGrouping="false" fluid />
          <Button type="button" icon="pi pi-search" severity="secondary" class="model-search-btn" v-tooltip.bottom="t('modelSearch.searchTooltip')" @click="openModelSearch('modelid2')" />
        </div>
      </EditorField>
      <EditorField :label="t('creature_template.fields.modelid3')" :modified="isFieldModified('modelid3')">
        <div class="model-field">
          <InputNumber v-model="form.modelid3" :useGrouping="false" fluid />
          <Button type="button" icon="pi pi-search" severity="secondary" class="model-search-btn" v-tooltip.bottom="t('modelSearch.searchTooltip')" @click="openModelSearch('modelid3')" />
        </div>
      </EditorField>
      <EditorField :label="t('creature_template.fields.modelid4')" :modified="isFieldModified('modelid4')">
        <div class="model-field">
          <InputNumber v-model="form.modelid4" :useGrouping="false" fluid />
          <Button type="button" icon="pi pi-search" severity="secondary" class="model-search-btn" v-tooltip.bottom="t('modelSearch.searchTooltip')" @click="openModelSearch('modelid4')" />
        </div>
      </EditorField>
      <EditorField :label="t('creature_template.fields.scale')" :modified="isFieldModified('scale')">
        <InputNumber v-model="form.scale" :minFractionDigits="1" :maxFractionDigits="5" :useGrouping="false" fluid />
      </EditorField>
    </div>
  </div>

  <!-- Animation -->
  <div class="field-group">
    <div class="field-group-header">
      <h4>{{ t('creature_template.groups.animation') }}</h4>
      <p>{{ t('creature_template.groups.animationDesc') }}</p>
    </div>
    <div class="field-grid">
      <EditorField :label="t('creature_template.fields.addon_standstate')" :modified="isAddonModified('StandState')">
        <Select v-model="addonForm.StandState" :options="standStateOptions" optionLabel="label" optionValue="value" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.addon_animtier')" :modified="isAddonModified('AnimTier')">
        <Select v-model="addonForm.AnimTier" :options="animTierOptions" optionLabel="label" optionValue="value" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.addon_emote')" :modified="isAddonModified('emote')">
        <InputNumber v-model="addonForm.emote" :useGrouping="false" fluid />
      </EditorField>
    </div>
  </div>

  <!-- Visibility -->
  <div class="field-group">
    <div class="field-group-header">
      <h4>{{ t('creature_template.groups.visibility') }}</h4>
      <p>{{ t('creature_template.groups.visibilityDesc') }}</p>
    </div>
    <div class="field-grid">
      <EditorField :label="t('creature_template.fields.addon_visflags')" :modified="isAddonModified('VisFlags')">
        <BitmaskField v-model="addonForm.VisFlags" :options="vis_flags_options" :label="t('creature_template.fields.addon_visflags')" />
      </EditorField>
      <EditorField :label="t('creature_template.fields.addon_visdistance')" :modified="isAddonModified('visibilityDistanceType')">
        <Select v-model="addonForm.visibilityDistanceType" :options="visDistOptions" optionLabel="label" optionValue="value" fluid />
      </EditorField>
    </div>
  </div>

  <!-- Vehicle & Mount -->
  <div class="field-group">
    <div class="field-group-header">
      <h4>{{ t('creature_template.groups.vehicle') }}</h4>
      <p>{{ t('creature_template.groups.vehicleDesc') }}</p>
    </div>
    <div class="field-grid">
      <EditorField :label="t('creature_template.fields.addon_mount')" :modified="isAddonModified('mount')">
        <InputNumber v-model="addonForm.mount" :useGrouping="false" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.addon_mountcreatureid')" :modified="isAddonModified('MountCreatureID')">
        <InputNumber v-model="addonForm.MountCreatureID" :useGrouping="false" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.VehicleId')" :modified="isFieldModified('VehicleId')">
        <InputNumber v-model="form.VehicleId" :useGrouping="false" fluid />
      </EditorField>
    </div>
  </div>

  <!-- Equipment (creature_equip_template) -->
  <div class="field-group" :class="{ 'field-group-modified': equipHasChanges }">
    <EditableDataTable
      :entries="equipEntries"
      :columns="equipColumns"
      :hasChanges="equipHasChanges"
      :title="t('creature_template.groups.equipment')"
      :description="t('creature_template.groups.equipmentDesc')"
      dataKey="ID"
      showHeaderAdd
      embedded
      @add="addEquipSet"
      @remove="removeEquip"
    />
  </div>

  <ModelSearchDialog v-model:visible="modelDialogVisible" kind="creature" @select="onModelSelect" />
</template>

<style scoped>
@import '../npc-editor.css';

/* Model field: number input + "search a model" button on one row. */
.model-field {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.model-field :deep(.p-inputnumber) {
  flex: 1;
  min-width: 0;
}
</style>
