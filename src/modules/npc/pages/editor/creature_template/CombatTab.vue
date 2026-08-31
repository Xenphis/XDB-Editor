<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import { difficulty_entry_options, mechanic_immune_mask_options, spell_school_immune_mask_options, sheath_state_types, dmg_school_options, spell_school_types } from '@/modules/npc/types/defines'
import EditorField from '@core/components/EditorField.vue'
import BitmaskField from '@core/components/BitmaskField.vue'
import EditableDataTable, { type ColumnDef } from '@core/components/EditableDataTable.vue'
import { useNpcModuleStore } from '@/modules/npc/store'
import { useNpcFieldModifiers } from '@/modules/npc/pages/useNpcFieldModifiers'

const { t } = useI18n()
const store = useNpcModuleStore()
const { isFieldModified, isAddonModified } = useNpcFieldModifiers()

const form = store.formData
const addonForm = store.addon.newEntry
const spellEntries = computed(() => store.spells.getNewEntries())
const resistanceEntries = computed(() => store.resistances.getNewEntries())

const MAX_CREATURE_SPELLS = 8
const MAX_RESISTANCES = 6

const sheathStateOptions = sheath_state_types.map(o => ({ value: o.value, label: o.name }))
const dmgschoolOptions = dmg_school_options.map(o => ({ value: o.value, label: o.name }))
const resistanceSchoolOptions = spell_school_types.map(o => ({ value: o.value, label: o.name }))
const difficultyEntryOptions = difficulty_entry_options.map(o => ({ value: o.value, label: o.name }))

const spellHasChanges = computed(() => store.spells.getSqlDiff(form.entry).length > 0)
const resistanceHasChanges = computed(() => store.resistances.getSqlDiff(form.entry).length > 0)

const spellColumns: ColumnDef[] = [
  { field: 'Index', header: 'Slot', type: 'readonly', width: '5rem' },
  { field: 'Spell', header: t('creature_template.fields.spell_id'), type: 'number' },
]

const resistanceColumns: ColumnDef[] = [
  {
    field: 'School',
    header: t('creature_template.fields.resistance_school'),
    type: 'select',
    width: '14rem',
    optionsFn: (data, allEntries) => {
      const usedSchools = new Set(allEntries.filter(e => e !== data).map(e => e.School))
      return resistanceSchoolOptions.filter(o => !usedSchools.has(o.value))
    },
  },
  { field: 'Resistance', header: t('creature_template.fields.resistance_value'), type: 'number' },
]

function addSpell() {
  if (spellEntries.value.length >= MAX_CREATURE_SPELLS) return
  const usedIndices = new Set(spellEntries.value.map(s => s.Index))
  let nextIndex = 0
  while (usedIndices.has(nextIndex) && nextIndex < MAX_CREATURE_SPELLS) nextIndex++
  if (nextIndex >= MAX_CREATURE_SPELLS) return
  store.spells.pushNewEntry({ Index: nextIndex, Spell: 0 })
}

function removeSpell(index: number) {
  store.spells.removeNewEntry(index)
}

function addResistance() {
  if (resistanceEntries.value.length >= MAX_RESISTANCES) return
  const usedSchools = new Set(resistanceEntries.value.map(r => r.School))
  let nextSchool = 1
  while (usedSchools.has(nextSchool) && nextSchool <= MAX_RESISTANCES) nextSchool++
  if (nextSchool > MAX_RESISTANCES) return
  store.resistances.pushNewEntry({ School: nextSchool, Resistance: 0 })
}

function removeResistance(index: number) {
  store.resistances.removeNewEntry(index)
}
</script>

<template>
  <!-- Combat Parameters -->
  <div class="field-group">
    <div class="field-group-header">
      <h4>{{ t('creature_template.groups.combatParams') }}</h4>
      <p>{{ t('creature_template.groups.combatParamsDesc') }}</p>
    </div>
    <div class="field-grid">
      <EditorField :label="t('creature_template.fields.DamageModifier')" :modified="isFieldModified('DamageModifier')">
        <InputNumber v-model="form.DamageModifier" :minFractionDigits="1" :maxFractionDigits="5" :useGrouping="false" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.BaseAttackTime')" :modified="isFieldModified('BaseAttackTime')">
        <InputNumber v-model="form.BaseAttackTime" :useGrouping="false" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.RangeAttackTime')" :modified="isFieldModified('RangeAttackTime')">
        <InputNumber v-model="form.RangeAttackTime" :useGrouping="false" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.BaseVariance')" :modified="isFieldModified('BaseVariance')">
        <InputNumber v-model="form.BaseVariance" :minFractionDigits="1" :maxFractionDigits="5" :useGrouping="false" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.RangeVariance')" :modified="isFieldModified('RangeVariance')">
        <InputNumber v-model="form.RangeVariance" :minFractionDigits="1" :maxFractionDigits="5" :useGrouping="false" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.addon_sheathstate')" :modified="isAddonModified('SheathState')">
        <Select v-model="addonForm.SheathState" :options="sheathStateOptions" optionLabel="label" optionValue="value" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.dmgschool')" :modified="isFieldModified('dmgschool')">
        <Select v-model="form.dmgschool" :options="dmgschoolOptions" optionLabel="label" optionValue="value" fluid />
      </EditorField>
    </div>
  </div>

  <!-- Creature Template Spells (creature_template_spell) -->
  <div class="field-group" :class="{ 'field-group-modified': spellHasChanges }">
    <EditableDataTable
      :entries="spellEntries"
      :columns="spellColumns"
      :hasChanges="spellHasChanges"
      :maxRows="MAX_CREATURE_SPELLS"
      :title="t('creature_template.groups.creatureSpells')"
      :description="t('creature_template.groups.creatureSpellsDesc')"
      dataKey="Index"
      showHeaderAdd
      embedded
      @add="addSpell"
      @remove="removeSpell"
    />
  </div>

  <!-- Resistances (creature_template_resistance) -->
  <div class="field-group" :class="{ 'field-group-modified': resistanceHasChanges }">
    <EditableDataTable
      :entries="resistanceEntries"
      :columns="resistanceColumns"
      :hasChanges="resistanceHasChanges"
      :maxRows="MAX_RESISTANCES"
      :title="t('creature_template.groups.resistances')"
      :description="t('creature_template.groups.resistancesDesc')"
      dataKey="School"
      showHeaderAdd
      embedded
      @add="addResistance"
      @remove="removeResistance"
    />
  </div>

  <!-- Immunities -->
  <div class="field-group">
    <div class="field-group-header">
      <h4>{{ t('creature_template.groups.aurasAndImmunities') }}</h4>
      <p>{{ t('creature_template.groups.aurasAndImmunitiesDesc') }}</p>
    </div>
    <div class="field-grid">
      <EditorField :label="t('creature_template.fields.addon_auras')" :modified="isAddonModified('auras')">
        <InputText v-model="addonForm.auras" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.mechanic_immune_mask')" :modified="isFieldModified('mechanic_immune_mask')">
        <BitmaskField v-model="form.mechanic_immune_mask" :options="mechanic_immune_mask_options" :label="t('creature_template.fields.mechanic_immune_mask')" />
      </EditorField>
      <EditorField :label="t('creature_template.fields.spell_school_immune_mask')" :modified="isFieldModified('spell_school_immune_mask')">
        <BitmaskField v-model="form.spell_school_immune_mask" :options="spell_school_immune_mask_options" :label="t('creature_template.fields.spell_school_immune_mask')" />
      </EditorField>
    </div>
  </div>

  <!-- Miscellaneous -->
  <div class="field-group">
    <div class="field-group-header">
      <h4>{{ t('creature_template.groups.miscCombat') }}</h4>
      <p>{{ t('creature_template.groups.miscCombatDesc') }}</p>
    </div>
    <div class="field-grid">
      <EditorField :label="t('creature_template.fields.difficulty_entry_1')" :modified="isFieldModified('difficulty_entry_1')">
        <Select v-model="form.difficulty_entry_1" :options="difficultyEntryOptions" optionLabel="label" optionValue="value" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.difficulty_entry_2')" :modified="isFieldModified('difficulty_entry_2')">
        <Select v-model="form.difficulty_entry_2" :options="difficultyEntryOptions" optionLabel="label" optionValue="value" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.difficulty_entry_3')" :modified="isFieldModified('difficulty_entry_3')">
        <Select v-model="form.difficulty_entry_3" :options="difficultyEntryOptions" optionLabel="label" optionValue="value" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.KillCredit1')" :modified="isFieldModified('KillCredit1')">
        <InputNumber v-model="form.KillCredit1" :useGrouping="false" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.KillCredit2')" :modified="isFieldModified('KillCredit2')">
        <InputNumber v-model="form.KillCredit2" :useGrouping="false" fluid />
      </EditorField>
    </div>
  </div>
</template>

<style scoped>
@import '../npc-editor.css';
</style>
