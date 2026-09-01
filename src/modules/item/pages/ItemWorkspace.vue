<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import EntityWorkspace from '@core/components/workspace/EntityWorkspace.vue';
import EntityListPanel from '@core/components/workspace/EntityListPanel.vue';
import ObjectTableSwitch from '@/modules/object/ObjectTableSwitch.vue';
import InspectorPanel from '@core/components/workspace/InspectorPanel.vue';
import WorkspaceEmptyState from '@core/components/workspace/WorkspaceEmptyState.vue';
import EditorHeader from '@core/components/EditorHeader.vue';
import SectionTabs, { type SectionTabItem } from '@core/components/SectionTabs.vue';
import EditorField from '@core/components/EditorField.vue';
import BitmaskField from '@core/components/BitmaskField.vue';
import type { ItemTemplate } from '@/modules/item/item_template';
import { useItemModuleStore } from '@/modules/item/store';
import { useItemEnumOptions } from '@/modules/item/composables/useItemEnumOptions';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useItemModuleStore();

/** undefined = no selection, null = create mode, number = edit. */
const entryParam = computed<number | null | undefined>(() => {
  const param = route.params.entry as string | undefined;
  if (param === undefined || param === '') return undefined;
  if (param === 'new') return null;
  const n = Number(param);
  return Number.isNaN(n) ? undefined : n;
});
const itemEntry = computed(() => entryParam.value ?? null);

const loading = ref(false);
const form = store.formData;

// --- List ---
function metaOf(item: ItemTemplate): string {
  const quality = itemQualityOptions.value.find(q => q.value === item.Quality)?.name ?? `Q${item.Quality}`;
  return `#${item.entry} · ${quality} · ilvl ${item.ItemLevel}`;
}

async function onListSearch(query: string) {
  store.currentSearch = query;
  await store.fetchItems(query || undefined, 50);
}

function onListSelect(item: ItemTemplate) {
  router.push(`/object/item-template/${item.entry}`);
}

function onListAdd() {
  router.push('/object/item-template/new');
}

async function onListRemove(item: ItemTemplate) {
  try {
    await store.deleteItem(item.entry);
    if (entryParam.value === item.entry) {
      router.push('/object/item-template');
    }
  } catch (e) {
    console.error('Failed to delete item:', e);
  }
}

onMounted(() => {
  if (!store.listLoaded) {
    store.fetchItems(undefined, 50);
  }
});

const {
  itemClassOptions: classOptions,
  itemSubclassOptions: subclassOptions,
  itemQualityOptions,
  inventoryTypeOptions,
  honorRankOptions,
  reputationRankOptions,
  statTypeOptions,
  damageTypeOptions,
  spellTriggerOptions,
  bondingOptions,
  languageOptions,
  materialOptions,
  sheathOptions,
  socketColorOptions,
  bagFamilyOptions,
  totemCategoryOptions,
  foodTypeOptions,
  itemFlags,
  itemFlagsExtra,
  allowableClassOptions,
  allowableRaceOptions,
} = useItemEnumOptions();

const modifiedFieldSet = computed(() => new Set(store.combinedChangedFields.map(c => c.field)));

function isFieldModified(field: string): boolean {
  return modifiedFieldSet.value.has(field);
}

watch(entryParam, async (val) => {
  if (val === undefined) {
    store.closeEditor();
    return;
  }
  if (store.editorDataLoaded && store.editingEntry === val) return;
  loading.value = true;
  try {
    await store.openEditor(val ?? 'new');
  } finally {
    loading.value = false;
  }
}, { immediate: true });

async function save() {
  try {
    const savedEntry = form.entry;
    await store.saveItem();
    if (entryParam.value === null && savedEntry) {
      router.push(`/object/item-template/${savedEntry}`);
    }
  } catch (e) {
    console.error('Failed to save item:', e);
  }
}

function onDiscard() {
  store.discardChanges();
}

const mainTabs = computed<SectionTabItem[]>(() => [
  { value: '0', label: t('itemEditor.tabs.general') },
  { value: '1', label: t('itemEditor.tabs.requirements') },
  { value: '2', label: t('itemEditor.tabs.stats') },
  { value: '3', label: t('itemEditor.tabs.misc') },
]);
</script>

<template>
  <EntityWorkspace storageKey="object" listWidth="320px">
    <template #list>
      <ObjectTableSwitch />
      <EntityListPanel
        :items="store.items"
        :idOf="(i: ItemTemplate) => i.entry"
        :titleOf="(i: ItemTemplate) => i.name"
        :metaOf="metaOf"
        :selectedId="entryParam ?? null"
        :modifiedIds="store.modifiedIds"
        :loading="store.loading"
        :searchPlaceholder="t('item.searchPlaceholder')"
        removable
        @select="onListSelect"
        @add="onListAdd"
        @search="onListSearch"
        @remove="onListRemove"
      />
    </template>

    <template #editor>
      <template v-if="entryParam !== undefined">
        <EditorHeader
          :subtitle="form.name || t('itemEditor.editorTitle')"
          :id="form.entry"
          table="item_template"
          :showBack="false"
          :hasChanges="store.combinedHasChanges"
          :discardLabel="t('itemEditor.discard')"
          :executeLabel="t('itemEditor.execute')"
          @discard="onDiscard"
          @execute="save"
        />

        <div v-if="loading" class="editor-loading">
          <i class="pi pi-spin pi-spinner"></i>
        </div>

        <SectionTabs v-else :tabs="mainTabs" variant="plain" defaultValue="0">
            <!-- General Tab -->
            <template #0>
              <!-- Basic Information -->
              <div class="field-group">
                <div class="field-group-header">
                  <h4>{{ t('itemEditor.groups.basic') }}</h4>
                  <p>{{ t('itemEditor.groups.basicDesc') }}</p>
                </div>

                <div class="field-grid">
                  <EditorField :label="t('itemEditor.fields.entry')" :modified="isFieldModified('entry')">
                    <InputNumber v-model="form.entry" :disabled="itemEntry != null" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.name')" :modified="isFieldModified('name')">
                    <InputText v-model="form.name" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.class')" :modified="isFieldModified('class')">
                    <Select v-model="form.class" :options="classOptions" optionLabel="name" optionValue="value" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.subclass')" :modified="isFieldModified('subclass')">
                    <Select v-model="form.subclass" :options="subclassOptions" optionLabel="name" optionValue="value" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.SoundOverrideSubclass')" :modified="isFieldModified('SoundOverrideSubclass')">
                    <InputNumber v-model="form.SoundOverrideSubclass" fluid />
                  </EditorField>
                </div>
              </div>

              <!-- Display & Quality -->
              <div class="field-group">
                <div class="field-group-header">
                  <h4>{{ t('itemEditor.groups.display') }}</h4>
                  <p>{{ t('itemEditor.groups.displayDesc') }}</p>
                </div>
                <div class="field-grid">
                  <EditorField :label="t('itemEditor.fields.displayid')" :modified="isFieldModified('displayid')">
                    <InputNumber v-model="form.displayid" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.Quality')" :modified="isFieldModified('Quality')">
                    <Select v-model="form.Quality" :options="itemQualityOptions" optionLabel="name" optionValue="value" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.InventoryType')" :modified="isFieldModified('InventoryType')">
                    <Select v-model="form.InventoryType" :options="inventoryTypeOptions" optionLabel="name" optionValue="value" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.ItemLevel')" :modified="isFieldModified('ItemLevel')">
                    <InputNumber v-model="form.ItemLevel" fluid />
                  </EditorField>
                </div>
              </div>

              <!-- Economy -->
              <div class="field-group">
                <div class="field-group-header">
                  <h4>{{ t('itemEditor.groups.economy') }}</h4>
                  <p>{{ t('itemEditor.groups.economyDesc') }}</p>
                </div>
                <div class="field-grid">
                  <EditorField :label="t('itemEditor.fields.BuyPrice')" :modified="isFieldModified('BuyPrice')">
                    <InputNumber v-model="form.BuyPrice" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.SellPrice')" :modified="isFieldModified('SellPrice')">
                    <InputNumber v-model="form.SellPrice" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.BuyCount')" :modified="isFieldModified('BuyCount')">
                    <InputNumber v-model="form.BuyCount" fluid />
                  </EditorField>
                </div>
              </div>

              <!-- Inventory -->
              <div class="field-group">
                <div class="field-group-header">
                  <h4>{{ t('itemEditor.groups.inventory') }}</h4>
                  <p>{{ t('itemEditor.groups.inventoryDesc') }}</p>
                </div>
                <div class="field-grid">
                  <EditorField :label="t('itemEditor.fields.stackable')" :modified="isFieldModified('stackable')">
                    <InputNumber v-model="form.stackable" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.maxcount')" :modified="isFieldModified('maxcount')">
                    <InputNumber v-model="form.maxcount" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.ContainerSlots')" :modified="isFieldModified('ContainerSlots')">
                    <InputNumber v-model="form.ContainerSlots" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.bonding')" :modified="isFieldModified('bonding')">
                    <Select v-model="form.bonding" :options="bondingOptions" optionLabel="name" optionValue="value" fluid />
                  </EditorField>
                </div>
              </div>

              <!-- Description -->
              <div class="field-group">
                <div class="field-group-header">
                  <h4>{{ t('itemEditor.fields.description') }}</h4>
                  <p>Item description text</p>
                </div>
                <EditorField :label="t('itemEditor.fields.description')" :modified="isFieldModified('description')">
                  <Textarea v-model="form.description" rows="3" fluid />
                </EditorField>
              </div>
            </template>

            <!-- Requirements Tab -->
            <template #1>
              <!-- Level Requirements -->
              <div class="field-group">
                <div class="field-group-header">
                  <h4>{{ t('itemEditor.groups.level') }}</h4>
                  <p>{{ t('itemEditor.groups.levelDesc') }}</p>
                </div>
                <div class="field-grid">
                  <EditorField :label="t('itemEditor.fields.RequiredLevel')" :modified="isFieldModified('RequiredLevel')">
                    <InputNumber v-model="form.RequiredLevel" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.RequiredSkill')" :modified="isFieldModified('RequiredSkill')">
                    <InputNumber v-model="form.RequiredSkill" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.RequiredSkillRank')" :modified="isFieldModified('RequiredSkillRank')">
                    <InputNumber v-model="form.RequiredSkillRank" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.requiredspell')" :modified="isFieldModified('requiredspell')">
                    <InputNumber v-model="form.requiredspell" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.requiredhonorrank')" :modified="isFieldModified('requiredhonorrank')">
                    <Select v-model="form.requiredhonorrank" :options="honorRankOptions" optionLabel="name" optionValue="value" fluid />
                  </EditorField>
                </div>
              </div>

              <!-- Reputation Requirements -->
              <div class="field-group">
                <div class="field-group-header">
                  <h4>{{ t('itemEditor.groups.reputation') }}</h4>
                  <p>{{ t('itemEditor.groups.reputationDesc') }}</p>
                </div>
                <div class="field-grid">
                  <EditorField :label="t('itemEditor.fields.RequiredReputationFaction')" :modified="isFieldModified('RequiredReputationFaction')">
                    <InputNumber v-model="form.RequiredReputationFaction" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.RequiredReputationRank')" :modified="isFieldModified('RequiredReputationRank')">
                    <Select v-model="form.RequiredReputationRank" :options="reputationRankOptions" optionLabel="name" optionValue="value" fluid />
                  </EditorField>
                </div>
              </div>

              <!-- Class & Race Restrictions -->
              <div class="field-group">
                <div class="field-group-header">
                  <h4>{{ t('itemEditor.groups.classRace') }}</h4>
                  <p>{{ t('itemEditor.groups.classRaceDesc') }}</p>
                </div>
                <div class="field-grid">
                  <EditorField :label="t('itemEditor.fields.AllowableClass')" :modified="isFieldModified('AllowableClass')">
                    <BitmaskField v-model="form.AllowableClass" :options="allowableClassOptions" :label="t('itemEditor.fields.AllowableClass')" allow-negative-one />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.AllowableRace')" :modified="isFieldModified('AllowableRace')">
                    <BitmaskField v-model="form.AllowableRace" :options="allowableRaceOptions" :label="t('itemEditor.fields.AllowableRace')" allow-negative-one />
                  </EditorField>
                </div>
              </div>

              <!-- Location Restrictions -->
              <div class="field-group">
                <div class="field-group-header">
                  <h4>{{ t('itemEditor.groups.location') }}</h4>
                  <p>{{ t('itemEditor.groups.locationDesc') }}</p>
                </div>
                <div class="field-grid">
                  <EditorField :label="t('itemEditor.fields.area')" :modified="isFieldModified('area')">
                    <InputNumber v-model="form.area" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.Map')" :modified="isFieldModified('Map')">
                    <InputNumber v-model="form.Map" fluid />
                  </EditorField>
                </div>
              </div>
            </template>

            <!-- Stats Tab -->
            <template #2>
              <!-- Item Stats (1-10) -->
              <div class="field-group">
                <div class="field-group-header">
                  <h4>{{ t('itemEditor.groups.stats') }}</h4>
                  <p>{{ t('itemEditor.groups.statsDesc') }}</p>
                </div>
                <div class="field-grid">
                  <template v-for="i in 10" :key="`stat-${i}`">
                    <EditorField :label="`${t('itemEditor.fields.stat_type')} ${i}`" :modified="isFieldModified(`stat_type${i}`)">
                      <Select v-model="(form as any)[`stat_type${i}`]" :options="statTypeOptions" optionLabel="name" optionValue="value" fluid />
                    </EditorField>

                    <EditorField :label="`${t('itemEditor.fields.stat_value')} ${i}`" :modified="isFieldModified(`stat_value${i}`)">
                      <InputNumber v-model="(form as any)[`stat_value${i}`]" fluid />
                    </EditorField>
                  </template>

                  <EditorField :label="t('itemEditor.fields.ScalingStatDistribution')" :modified="isFieldModified('ScalingStatDistribution')">
                    <InputNumber v-model="form.ScalingStatDistribution" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.ScalingStatValue')" :modified="isFieldModified('ScalingStatValue')">
                    <InputNumber v-model="form.ScalingStatValue" fluid />
                  </EditorField>
                </div>
              </div>

              <!-- Damage & Defense -->
              <div class="field-group">
                <div class="field-group-header">
                  <h4>{{ t('itemEditor.groups.damage') }}</h4>
                  <p>{{ t('itemEditor.groups.damageDesc') }}</p>
                </div>
                <div class="field-grid">
                  <EditorField :label="t('itemEditor.fields.dmg_min1')" :modified="isFieldModified('dmg_min1')">
                    <InputNumber v-model="form.dmg_min1" :minFractionDigits="1" :maxFractionDigits="2" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.dmg_max1')" :modified="isFieldModified('dmg_max1')">
                    <InputNumber v-model="form.dmg_max1" :minFractionDigits="1" :maxFractionDigits="2" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.dmg_type1')" :modified="isFieldModified('dmg_type1')">
                    <Select v-model="form.dmg_type1" :options="damageTypeOptions" optionLabel="name" optionValue="value" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.dmg_min2')" :modified="isFieldModified('dmg_min2')">
                    <InputNumber v-model="form.dmg_min2" :minFractionDigits="1" :maxFractionDigits="2" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.dmg_max2')" :modified="isFieldModified('dmg_max2')">
                    <InputNumber v-model="form.dmg_max2" :minFractionDigits="1" :maxFractionDigits="2" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.dmg_type2')" :modified="isFieldModified('dmg_type2')">
                    <Select v-model="form.dmg_type2" :options="damageTypeOptions" optionLabel="name" optionValue="value" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.armor')" :modified="isFieldModified('armor')">
                    <InputNumber v-model="form.armor" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.delay')" :modified="isFieldModified('delay')">
                    <InputNumber v-model="form.delay" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.RangedModRange')" :modified="isFieldModified('RangedModRange')">
                    <InputNumber v-model="form.RangedModRange" :minFractionDigits="1" :maxFractionDigits="2" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.block')" :modified="isFieldModified('block')">
                    <InputNumber v-model="form.block" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.MaxDurability')" :modified="isFieldModified('MaxDurability')">
                    <InputNumber v-model="form.MaxDurability" fluid />
                  </EditorField>
                </div>
              </div>

              <!-- Resistances -->
              <div class="field-group">
                <div class="field-group-header">
                  <h4>{{ t('itemEditor.groups.resistances') }}</h4>
                  <p>{{ t('itemEditor.groups.resistancesDesc') }}</p>
                </div>
                <div class="field-grid">
                  <EditorField :label="t('itemEditor.fields.holy_res')" :modified="isFieldModified('holy_res')">
                    <InputNumber v-model="form.holy_res" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.fire_res')" :modified="isFieldModified('fire_res')">
                    <InputNumber v-model="form.fire_res" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.nature_res')" :modified="isFieldModified('nature_res')">
                    <InputNumber v-model="form.nature_res" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.frost_res')" :modified="isFieldModified('frost_res')">
                    <InputNumber v-model="form.frost_res" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.shadow_res')" :modified="isFieldModified('shadow_res')">
                    <InputNumber v-model="form.shadow_res" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.arcane_res')" :modified="isFieldModified('arcane_res')">
                    <InputNumber v-model="form.arcane_res" fluid />
                  </EditorField>
                </div>
              </div>

              <!-- Spells (1-5) -->
              <div class="field-group">
                <div class="field-group-header">
                  <h4>{{ t('itemEditor.groups.spells') }}</h4>
                  <p>{{ t('itemEditor.groups.spellsDesc') }}</p>
                </div>
                <template v-for="i in 5" :key="`spell-${i}`">
                  <h4 class="spell-header">Spell {{ i }}</h4>
                  <div class="field-grid">
                    <EditorField :label="t('itemEditor.fields.spellid')" :modified="isFieldModified(`spellid_${i}`)">
                      <InputNumber v-model="(form as any)[`spellid_${i}`]" fluid />
                    </EditorField>

                    <EditorField :label="t('itemEditor.fields.spelltrigger')" :modified="isFieldModified(`spelltrigger_${i}`)">
                      <Select v-model="(form as any)[`spelltrigger_${i}`]" :options="spellTriggerOptions" optionLabel="name" optionValue="value" fluid />
                    </EditorField>

                    <EditorField :label="t('itemEditor.fields.spellcharges')" :modified="isFieldModified(`spellcharges_${i}`)">
                      <InputNumber v-model="(form as any)[`spellcharges_${i}`]" fluid />
                    </EditorField>

                    <EditorField :label="t('itemEditor.fields.spellppmRate')" :modified="isFieldModified(`spellppmRate_${i}`)">
                      <InputNumber v-model="(form as any)[`spellppmRate_${i}`]" :minFractionDigits="1" :maxFractionDigits="2" fluid />
                    </EditorField>

                    <EditorField :label="t('itemEditor.fields.spellcooldown')" :modified="isFieldModified(`spellcooldown_${i}`)">
                      <InputNumber v-model="(form as any)[`spellcooldown_${i}`]" fluid />
                    </EditorField>

                    <EditorField :label="t('itemEditor.fields.spellcategory')" :modified="isFieldModified(`spellcategory_${i}`)">
                      <InputNumber v-model="(form as any)[`spellcategory_${i}`]" fluid />
                    </EditorField>

                    <EditorField :label="t('itemEditor.fields.spellcategorycooldown')" :modified="isFieldModified(`spellcategorycooldown_${i}`)">
                      <InputNumber v-model="(form as any)[`spellcategorycooldown_${i}`]" fluid />
                    </EditorField>
                  </div>
                </template>
              </div>

              <!-- Gem Sockets -->
              <div class="field-group">
                <div class="field-group-header">
                  <h4>{{ t('itemEditor.groups.sockets') }}</h4>
                  <p>{{ t('itemEditor.groups.socketsDesc') }}</p>
                </div>
                <div class="field-grid">
                  <template v-for="i in 3" :key="`socket-${i}`">
                    <EditorField :label="`${t('itemEditor.fields.socketColor')} ${i}`" :modified="isFieldModified(`socketColor_${i}`)">
                      <Select v-model="(form as any)[`socketColor_${i}`]" :options="socketColorOptions" optionLabel="name" optionValue="value" fluid />
                    </EditorField>

                    <EditorField :label="`${t('itemEditor.fields.socketContent')} ${i}`" :modified="isFieldModified(`socketContent_${i}`)">
                      <InputNumber v-model="(form as any)[`socketContent_${i}`]" fluid />
                    </EditorField>
                  </template>

                  <EditorField :label="t('itemEditor.fields.socketBonus')" :modified="isFieldModified('socketBonus')">
                    <InputNumber v-model="form.socketBonus" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.GemProperties')" :modified="isFieldModified('GemProperties')">
                    <InputNumber v-model="form.GemProperties" fluid />
                  </EditorField>
                </div>
              </div>
            </template>

            <!-- Misc Tab -->
            <template #3>
              <!-- Flags -->
              <div class="field-group">
                <div class="field-group-header">
                  <h4>{{ t('itemEditor.groups.flags') }}</h4>
                  <p>{{ t('itemEditor.groups.flagsDesc') }}</p>
                </div>
                <div class="field-grid">
                  <EditorField :label="t('itemEditor.fields.Flags')" :modified="isFieldModified('Flags')">
                    <BitmaskField v-model="form.Flags" :options="itemFlags" :label="t('itemEditor.fields.Flags')" />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.FlagsExtra')" :modified="isFieldModified('FlagsExtra')">
                    <BitmaskField v-model="form.FlagsExtra" :options="itemFlagsExtra" :label="t('itemEditor.fields.FlagsExtra')" />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.flagsCustom')" :modified="isFieldModified('flagsCustom')">
                    <InputNumber v-model="form.flagsCustom" fluid />
                  </EditorField>
                </div>
              </div>

              <!-- Advanced -->
              <div class="field-group">
                <div class="field-group-header">
                  <h4>{{ t('itemEditor.groups.advanced') }}</h4>
                  <p>{{ t('itemEditor.groups.advancedDesc') }}</p>
                </div>
                <div class="field-grid">
                  <EditorField :label="t('itemEditor.fields.Material')" :modified="isFieldModified('Material')">
                    <Select v-model="form.Material" :options="materialOptions" optionLabel="name" optionValue="value" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.sheath')" :modified="isFieldModified('sheath')">
                    <Select v-model="form.sheath" :options="sheathOptions" optionLabel="name" optionValue="value" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.BagFamily')" :modified="isFieldModified('BagFamily')">
                    <BitmaskField v-model="form.BagFamily" :options="bagFamilyOptions" :label="t('itemEditor.fields.BagFamily')" />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.TotemCategory')" :modified="isFieldModified('TotemCategory')">
                    <Select v-model="form.TotemCategory" :options="totemCategoryOptions" optionLabel="name" optionValue="value" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.PageText')" :modified="isFieldModified('PageText')">
                    <InputNumber v-model="form.PageText" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.LanguageID')" :modified="isFieldModified('LanguageID')">
                    <Select v-model="form.LanguageID" :options="languageOptions" optionLabel="name" optionValue="value" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.PageMaterial')" :modified="isFieldModified('PageMaterial')">
                    <InputNumber v-model="form.PageMaterial" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.startquest')" :modified="isFieldModified('startquest')">
                    <InputNumber v-model="form.startquest" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.lockid')" :modified="isFieldModified('lockid')">
                    <InputNumber v-model="form.lockid" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.RandomProperty')" :modified="isFieldModified('RandomProperty')">
                    <InputNumber v-model="form.RandomProperty" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.RandomSuffix')" :modified="isFieldModified('RandomSuffix')">
                    <InputNumber v-model="form.RandomSuffix" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.itemset')" :modified="isFieldModified('itemset')">
                    <InputNumber v-model="form.itemset" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.RequiredDisenchantSkill')" :modified="isFieldModified('RequiredDisenchantSkill')">
                    <InputNumber v-model="form.RequiredDisenchantSkill" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.ArmorDamageModifier')" :modified="isFieldModified('ArmorDamageModifier')">
                    <InputNumber v-model="form.ArmorDamageModifier" :minFractionDigits="1" :maxFractionDigits="2" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.duration')" :modified="isFieldModified('duration')">
                    <InputNumber v-model="form.duration" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.ItemLimitCategory')" :modified="isFieldModified('ItemLimitCategory')">
                    <InputNumber v-model="form.ItemLimitCategory" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.HolidayId')" :modified="isFieldModified('HolidayId')">
                    <InputNumber v-model="form.HolidayId" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.ScriptName')" :modified="isFieldModified('ScriptName')">
                    <InputText v-model="form.ScriptName" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.DisenchantID')" :modified="isFieldModified('DisenchantID')">
                    <InputNumber v-model="form.DisenchantID" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.FoodType')" :modified="isFieldModified('FoodType')">
                    <Select v-model="form.FoodType" :options="foodTypeOptions" optionLabel="name" optionValue="value" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.minMoneyLoot')" :modified="isFieldModified('minMoneyLoot')">
                    <InputNumber v-model="form.minMoneyLoot" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.maxMoneyLoot')" :modified="isFieldModified('maxMoneyLoot')">
                    <InputNumber v-model="form.maxMoneyLoot" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.ammo_type')" :modified="isFieldModified('ammo_type')">
                    <InputNumber v-model="form.ammo_type" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.RequiredCityRank')" :modified="isFieldModified('RequiredCityRank')">
                    <InputNumber v-model="form.RequiredCityRank" fluid />
                  </EditorField>

                  <EditorField :label="t('itemEditor.fields.VerifiedBuild')" :modified="isFieldModified('VerifiedBuild')">
                    <InputNumber v-model="form.VerifiedBuild" fluid />
                  </EditorField>
                </div>
              </div>
            </template>
        </SectionTabs>
      </template>

      <WorkspaceEmptyState v-else />
    </template>

    <template #inspector>
      <InspectorPanel
        v-if="entryParam !== undefined"
        :title="t('workspace.inspector')"
        :subtitle="form.name || undefined"
        storageKey="item"
        :changedFields="store.combinedChangedFields"
        :diffQuery="store.combinedDiffQuery"
        :fullQuery="store.combinedFullQuery"
        :hasChanges="store.combinedHasChanges"
      >
        <template #facts>
          <dl class="item-facts">
            <div class="item-facts-row">
              <dt>{{ t('item.columns.Quality') }}</dt>
              <dd>{{ itemQualityOptions.find(q => q.value === form.Quality)?.name ?? form.Quality }}</dd>
            </div>
            <div class="item-facts-row">
              <dt>{{ t('item.columns.ItemLevel') }}</dt>
              <dd>{{ form.ItemLevel }}</dd>
            </div>
            <div class="item-facts-row">
              <dt>{{ t('item.columns.class') }}</dt>
              <dd>{{ classOptions.find(c => c.value === form.class)?.name ?? form.class }}</dd>
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

.item-facts {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.item-facts-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.78rem;
}

.item-facts-row dt {
  color: var(--text-muted);
}

.item-facts-row dd {
  margin: 0;
  color: var(--text);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.spell-header {
  grid-column: 1 / -1;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-soft);
  margin: 1rem 0 0.5rem 0;
  padding-top: 1rem;
  border-top: 1px solid var(--border-default);
}

.spell-header:first-of-type {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

</style>
