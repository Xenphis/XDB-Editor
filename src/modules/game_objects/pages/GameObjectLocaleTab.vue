<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import EditorField from '@core/components/EditorField.vue'
import { locale_options } from '@core/types/common'
import { useGameObjectModuleStore } from '@/modules/game_objects/store'

const { t } = useI18n()
const store = useGameObjectModuleStore()

// One fixed tab per translatable locale. A row in gameobject_template_locale is
// created on demand when the user starts editing a given locale.
const allLocales = locale_options.map(o => String(o.value))
const activeLocale = ref<string>(allLocales[0] ?? '')

interface LocaleManager {
  getNewEntries(): any[]
  getOriginalEntries(): any[] | null
  pushNewEntry(entry: any): void
}

function hasEntry(mgr: LocaleManager, locale: string): boolean {
  return mgr.getNewEntries().some(e => e.locale === locale)
}

function createEntry(mgr: LocaleManager, locale: string): void {
  if (!hasEntry(mgr, locale)) mgr.pushNewEntry({ locale, name: null, castBarCaption: null })
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

function localeCardModified(locale: string): boolean {
  const origHas = store.locales.getOriginalEntries()?.some(e => e.locale === locale) ?? false
  const curHas = hasEntry(store.locales, locale)
  if (origHas !== curHas) return true
  return ['name', 'castBarCaption'].some(k => mModified(store.locales, locale, k))
}

const localeFields: { key: string; labelKey: string }[] = [
  { key: 'name', labelKey: 'gameobjectEditor.fields.locale_name' },
  { key: 'castBarCaption', labelKey: 'gameobjectEditor.fields.locale_castBarCaption' },
]
</script>

<template>
  <div class="tab-content">
    <Tabs :value="activeLocale" @update:value="(v) => activeLocale = String(v)">
      <TabList>
        <Tab v-for="locale in allLocales" :key="locale" :value="locale">{{ locale }}</Tab>
      </TabList>

      <TabPanels>
        <TabPanel v-for="locale in allLocales" :key="locale" :value="locale">
          <div class="field-group" :class="{ 'field-group-modified': localeCardModified(locale) }">
            <div class="field-group-header">
              <h4>{{ t('gameobjectEditor.groups.locales') }}</h4>
              <p>{{ t('gameobjectEditor.groups.localesDesc') }}</p>
            </div>
            <div v-if="hasEntry(store.locales, locale)" class="field-grid">
              <EditorField
                v-for="f in localeFields"
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
              <span>{{ t('gameobjectEditor.fields.locale_missing') }}</span>
              <Button
                icon="pi pi-plus"
                :label="t('gameobjectEditor.fields.locale_create')"
                severity="secondary"
                size="small"
                @click="createEntry(store.locales, locale)"
              />
            </div>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<style scoped>
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
