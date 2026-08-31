<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import EditorField from '@core/components/EditorField.vue'
import { locale_options } from '@core/types/common'
import { useQuestModuleStore } from '@/modules/quests/store'

const { t } = useI18n()
const store = useQuestModuleStore()

// All translatable locales are shown as fixed tabs. Within each tab, every
// sub-table (template / offer reward / request items) either shows its fields
// (when a row exists for that locale) or a prompt to create the row.
const allLocales = locale_options.map(o => String(o.value))

const activeLocale = ref<string>(allLocales[0] ?? '')

// ─── Generic locale-manager helpers ─────────────────────────────────────────

interface LocaleManager {
  getNewEntries(): any[]
  getOriginalEntries(): any[] | null
  pushNewEntry(entry: any): void
}

function hasEntry(mgr: LocaleManager, locale: string): boolean {
  return mgr.getNewEntries().some(e => e.locale === locale)
}

function createEntry(mgr: LocaleManager, locale: string, makeDefault: (l: string) => any): void {
  if (!hasEntry(mgr, locale)) mgr.pushNewEntry(makeDefault(locale))
}

function mGet(mgr: LocaleManager, locale: string, key: string): any {
  const e = mgr.getNewEntries().find(x => x.locale === locale)
  return e ? e[key] ?? null : null
}

function mSet(mgr: LocaleManager, locale: string, key: string, value: any): void {
  const e = mgr.getNewEntries().find(x => x.locale === locale)
  if (e) e[key] = value
}

function mModified(mgr: LocaleManager, locale: string, key: string): boolean {
  const orig = mgr.getOriginalEntries()?.find(x => x.locale === locale)
  const ov = orig ? orig[key] ?? null : null
  return ov !== mGet(mgr, locale, key)
}

function localeCardModified(mgr: LocaleManager, locale: string, keys: string[]): boolean {
  const origHas = mgr.getOriginalEntries()?.some(e => e.locale === locale) ?? false
  const curHas = hasEntry(mgr, locale)
  if (origHas !== curHas) return true
  return keys.some(k => mModified(mgr, locale, k))
}

const makeTpl = (locale: string) => ({
  locale, LogTitle: null, QuestDescription: null, LogDescription: null,
  AreaDescription: null, QuestCompletionLog: null,
  ObjectiveText1: null, ObjectiveText2: null, ObjectiveText3: null, ObjectiveText4: null,
})
const makeOffer = (locale: string) => ({ locale, RewardText: null })
const makeReq = (locale: string) => ({ locale, CompletionText: null })

// ─── Template-locale field config (drives the first card) ───────────────────

const tplFields: { key: string; labelKey: string }[] = [
  { key: 'LogTitle', labelKey: 'quest_template.fields.locale_title' },
  { key: 'QuestDescription', labelKey: 'quest_template.fields.locale_details' },
  { key: 'LogDescription', labelKey: 'quest_template.fields.locale_objectives' },
  { key: 'AreaDescription', labelKey: 'quest_template.fields.locale_endtext' },
  { key: 'QuestCompletionLog', labelKey: 'quest_template.fields.locale_completedtext' },
  { key: 'ObjectiveText1', labelKey: 'quest_template.fields.locale_objectivetext1' },
  { key: 'ObjectiveText2', labelKey: 'quest_template.fields.locale_objectivetext2' },
  { key: 'ObjectiveText3', labelKey: 'quest_template.fields.locale_objectivetext3' },
  { key: 'ObjectiveText4', labelKey: 'quest_template.fields.locale_objectivetext4' },
]
const tplKeys = tplFields.map(f => f.key)

function tplCardModified(locale: string) { return localeCardModified(store.locales, locale, tplKeys) }
function offerCardModified(locale: string) { return localeCardModified(store.offerRewardLocales, locale, ['RewardText']) }
function reqCardModified(locale: string) { return localeCardModified(store.requestItemsLocales, locale, ['CompletionText']) }
</script>

<template>
  <div class="tab-content">
    <Tabs :value="activeLocale" @update:value="(v) => activeLocale = String(v)">
      <TabList>
        <Tab v-for="locale in allLocales" :key="locale" :value="locale">{{ locale }}</Tab>
      </TabList>

      <TabPanels>
        <TabPanel v-for="locale in allLocales" :key="locale" :value="locale">
          <!-- quest_template_locale -->
          <div class="field-group" :class="{ 'field-group-modified': tplCardModified(locale) }">
            <div class="field-group-header">
              <h4>{{ t('quest_template.groups.locales') }}</h4>
              <p>{{ t('quest_template.groups.localesDesc') }}</p>
            </div>
            <div v-if="hasEntry(store.locales, locale)" class="field-grid-2">
              <EditorField
                v-for="f in tplFields"
                :key="f.key"
                :label="t(f.labelKey)"
                :modified="mModified(store.locales, locale, f.key)"
              >
                <InputText
                  :modelValue="mGet(store.locales, locale, f.key)"
                  @update:modelValue="(v) => mSet(store.locales, locale, f.key, v)"
                  fluid
                />
              </EditorField>
            </div>
            <div v-else class="locale-create-prompt">
              <span>{{ t('quest_template.fields.locale_missing') }}</span>
              <Button
                icon="pi pi-plus"
                :label="t('quest_template.fields.locale_create')"
                severity="secondary"
                size="small"
                @click="createEntry(store.locales, locale, makeTpl)"
              />
            </div>
          </div>

          <!-- quest_offer_reward_locale -->
          <div class="field-group" :class="{ 'field-group-modified': offerCardModified(locale) }">
            <div class="field-group-header">
              <h4>{{ t('quest_template.groups.offer_reward_locale') }}</h4>
              <p>{{ t('quest_template.groups.offer_reward_localeDesc') }}</p>
            </div>
            <div v-if="hasEntry(store.offerRewardLocales, locale)" class="field-grid">
              <EditorField
                :label="t('quest_template.fields.RewardText')"
                :modified="mModified(store.offerRewardLocales, locale, 'RewardText')"
                :fullWidth="true"
              >
                <Textarea
                  :modelValue="mGet(store.offerRewardLocales, locale, 'RewardText')"
                  @update:modelValue="(v) => mSet(store.offerRewardLocales, locale, 'RewardText', v)"
                  rows="3"
                  fluid
                />
              </EditorField>
            </div>
            <div v-else class="locale-create-prompt">
              <span>{{ t('quest_template.fields.locale_missing') }}</span>
              <Button
                icon="pi pi-plus"
                :label="t('quest_template.fields.locale_create')"
                severity="secondary"
                size="small"
                @click="createEntry(store.offerRewardLocales, locale, makeOffer)"
              />
            </div>
          </div>

          <!-- quest_request_items_locale -->
          <div class="field-group" :class="{ 'field-group-modified': reqCardModified(locale) }">
            <div class="field-group-header">
              <h4>{{ t('quest_template.groups.request_items_locale') }}</h4>
              <p>{{ t('quest_template.groups.request_items_localeDesc') }}</p>
            </div>
            <div v-if="hasEntry(store.requestItemsLocales, locale)" class="field-grid">
              <EditorField
                :label="t('quest_template.fields.CompletionText')"
                :modified="mModified(store.requestItemsLocales, locale, 'CompletionText')"
                :fullWidth="true"
              >
                <Textarea
                  :modelValue="mGet(store.requestItemsLocales, locale, 'CompletionText')"
                  @update:modelValue="(v) => mSet(store.requestItemsLocales, locale, 'CompletionText', v)"
                  rows="3"
                  fluid
                />
              </EditorField>
            </div>
            <div v-else class="locale-create-prompt">
              <span>{{ t('quest_template.fields.locale_missing') }}</span>
              <Button
                icon="pi pi-plus"
                :label="t('quest_template.fields.locale_create')"
                severity="secondary"
                size="small"
                @click="createEntry(store.requestItemsLocales, locale, makeReq)"
              />
            </div>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<style scoped>
@import './quest-editor.css';

.locale-create-prompt {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1.5rem;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.field-group-modified {
  border-color: var(--accent-focus) !important;
}
</style>
