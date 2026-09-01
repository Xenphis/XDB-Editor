<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Button from 'primevue/button'
import { useCreatureEnumOptions } from '@/modules/npc/composables/useCreatureEnumOptions'
import { getByte, setByte } from '@/modules/npc/composables/bytesFields'
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
const modelEntries = computed(() => store.models.getNewEntries())

const MAX_MODELS = 4

// --- Model search (picker dialog — adds a new creature_template_model row) ---
const modelDialogVisible = ref(false)
function openModelSearch() {
  if (modelEntries.value.length >= MAX_MODELS) return
  modelDialogVisible.value = true
}
function onModelSelect(displayId: number) {
  addModel(displayId)
}

const { visFlagsOptions, standStateOptions, animTierOptions, visibilityDistanceOptions: visDistOptions } = useCreatureEnumOptions()

// bytes1 = StandState (byte 0) / unused (byte 1) / VisFlags (byte 2) / AnimTier (byte 3)
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

const modelHasChanges = computed(() => store.models.getSqlDiff(form.entry).length > 0)

const modelColumns: ColumnDef[] = [
  { field: 'Idx', header: '#', type: 'readonly', width: '3rem' },
  { field: 'CreatureDisplayID', header: t('creature_template.fields.model_displayid'), type: 'number' },
  { field: 'DisplayScale', header: t('creature_template.fields.model_scale'), type: 'number', fractionDigits: { min: 1, max: 5 } },
  { field: 'Probability', header: t('creature_template.fields.model_probability'), type: 'number', fractionDigits: { min: 0, max: 5 } },
]

function nextModelIdx(): number | null {
  const used = new Set(modelEntries.value.map(e => e.Idx))
  for (let idx = 0; idx < MAX_MODELS; idx++) {
    if (!used.has(idx)) return idx
  }
  return null
}

function addModel(displayId = 0) {
  const idx = nextModelIdx()
  if (idx === null) return
  store.models.pushNewEntry({ Idx: idx, CreatureDisplayID: displayId, DisplayScale: 1, Probability: 0 })
}

function removeModel(index: number) {
  store.models.removeNewEntry(index)
}
</script>

<template>
  <!-- Model & Display (creature_template_model) -->
  <div class="field-group" :class="{ 'field-group-modified': modelHasChanges }">
    <EditableDataTable
      :entries="modelEntries"
      :columns="modelColumns"
      :hasChanges="modelHasChanges"
      :maxRows="MAX_MODELS"
      :title="t('creature_template.groups.modelDisplay')"
      :description="t('creature_template.groups.modelDisplayDesc')"
      dataKey="Idx"
      embedded
      @add="addModel()"
      @remove="removeModel"
    >
      <template #add-row>
        <Button icon="pi pi-plus" :label="t('creature_template.fields.model_add')" severity="secondary" size="small" :disabled="modelEntries.length >= MAX_MODELS" @click="addModel()" />
        <Button icon="pi pi-search" :label="t('modelSearch.searchTooltip')" severity="secondary" size="small" :disabled="modelEntries.length >= MAX_MODELS" @click="openModelSearch" />
      </template>
    </EditableDataTable>
  </div>

  <!-- Animation -->
  <div class="field-group">
    <div class="field-group-header">
      <h4>{{ t('creature_template.groups.animation') }}</h4>
      <p>{{ t('creature_template.groups.animationDesc') }}</p>
    </div>
    <div class="field-grid">
      <EditorField :label="t('creature_template.fields.addon_standstate')" :modified="isAddonModified('bytes1')">
        <Select v-model="addonStandState" :options="standStateOptions" optionLabel="name" optionValue="value" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.addon_animtier')" :modified="isAddonModified('bytes1')">
        <Select v-model="addonAnimTier" :options="animTierOptions" optionLabel="name" optionValue="value" fluid />
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
      <EditorField :label="t('creature_template.fields.addon_visflags')" :modified="isAddonModified('bytes1')">
        <BitmaskField v-model="addonVisFlags" :options="visFlagsOptions" :label="t('creature_template.fields.addon_visflags')" />
      </EditorField>
      <EditorField :label="t('creature_template.fields.addon_visdistance')" :modified="isAddonModified('visibilityDistanceType')">
        <Select v-model="addonForm.visibilityDistanceType" :options="visDistOptions" optionLabel="name" optionValue="value" fluid />
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
</style>
