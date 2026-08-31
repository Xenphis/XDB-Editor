<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from 'primevue/dialog'
import ToggleSwitch from 'primevue/toggleswitch'
import SelectButton from 'primevue/selectbutton'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import { open } from '@tauri-apps/plugin-dialog'
import { useDebugStore } from '@core/stores/debugStore'
import { useThemeStore } from '@core/stores/themeStore'
import type { ThemeName } from '@core/stores/themeStore'
import { setLocale } from '@core/i18n'
import { useModelPreviewStore } from '@/modules/model_viewer/store'
import { useMapEditorStore } from '@/modules/map_editor/store'
import type { AppLocale } from '@/modules/registry'

const { t, locale } = useI18n()
const debug = useDebugStore()
const theme = useThemeStore()
const modelPreview = useModelPreviewStore()
const mapEditor = useMapEditorStore()

const visible = defineModel<boolean>('visible', { default: false })

// Native language names stay untranslated on purpose.
const localeOptions = [
  { label: 'Français', value: 'fr' },
  { label: 'English', value: 'en' },
]

const themeOptions = computed(() => [
  { label: t('settings.themeDark'), value: 'dark' },
  { label: t('settings.themeLight'), value: 'light' },
])

const sourceOptions = computed(() => [
  { label: t('modelViewer.settings.sourceLocal'), value: 'local' },
  { label: t('modelViewer.settings.sourceOnline'), value: 'online' },
])

function onToggleDebug(value: boolean) {
  debug.setEnabled(value)
}

/** Native folder picker; unlike the map editor toolbar, does not trigger a load. */
async function browseClientPath() {
  const dir = await open({
    directory: true,
    multiple: false,
    title: t('mapEditor.clientPath.browseTitle'),
    defaultPath: mapEditor.clientPath.trim() || undefined,
  })
  if (typeof dir === 'string') {
    mapEditor.clientPath = dir
  }
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :header="t('settings.title')"
    modal
    :closable="true"
    :draggable="false"
    :style="{ width: '32rem' }"
    :pt="{
      root: { style: 'background: var(--surface-base); border: 1px solid var(--border-input); border-radius: 0.75rem; overflow: hidden;' },
      header: { style: 'background: var(--surface-base); border-bottom: 1px solid var(--border-default); padding: 1.25rem 1.5rem; color: var(--text);' },
      content: { style: 'background: var(--surface-base); padding: 1.5rem; max-height: 75vh; overflow-y: auto;' },
      headerActions: { style: 'color: var(--text-muted);' },
      mask: { style: 'background: rgba(0,0,0,0.6);' },
    }"
  >
    <!-- General -->
    <h3 class="setting-section-title">{{ t('settings.general') }}</h3>

    <div class="setting-row">
      <div class="setting-info">
        <span class="setting-label">{{ t('settings.language') }}</span>
        <p class="setting-desc">{{ t('settings.languageDesc') }}</p>
      </div>
      <SelectButton
        :modelValue="locale"
        :options="localeOptions"
        optionLabel="label"
        optionValue="value"
        :allowEmpty="false"
        @update:modelValue="setLocale($event as AppLocale)"
      />
    </div>

    <div class="setting-row">
      <div class="setting-info">
        <span class="setting-label">{{ t('settings.theme') }}</span>
        <p class="setting-desc">{{ t('settings.themeDesc') }}</p>
      </div>
      <SelectButton
        :modelValue="theme.theme"
        :options="themeOptions"
        optionLabel="label"
        optionValue="value"
        :allowEmpty="false"
        @update:modelValue="theme.setTheme($event as ThemeName)"
      />
    </div>

    <div class="setting-divider"></div>

    <!-- Game client (shared by the map editor and the model preview) -->
    <h3 class="setting-section-title">{{ t('settings.gameClientSection') }}</h3>

    <div class="setting-block">
      <div class="setting-info">
        <span class="setting-label">{{ t('settings.clientPath') }}</span>
        <p class="setting-desc">{{ t('settings.clientPathDesc') }}</p>
      </div>
      <div class="setting-path-row">
        <InputText
          v-model="mapEditor.clientPath"
          :placeholder="t('mapEditor.clientPath.placeholder')"
          fluid
        />
        <Button
          icon="pi pi-folder-open"
          severity="secondary"
          :aria-label="t('mapEditor.clientPath.browse')"
          v-tooltip.bottom="t('mapEditor.clientPath.browse')"
          @click="browseClientPath"
        />
      </div>
    </div>

    <div class="setting-divider"></div>

    <!-- Model preview source -->
    <h3 class="setting-section-title">{{ t('modelViewer.settings.title') }}</h3>

    <div class="setting-block">
      <div class="setting-info">
        <p class="setting-desc">{{ t('modelViewer.settings.sourceDesc') }}</p>
      </div>
      <SelectButton
        v-model="modelPreview.source"
        :options="sourceOptions"
        optionLabel="label"
        optionValue="value"
        :allowEmpty="false"
      />

      <div v-if="modelPreview.source === 'local'" class="setting-sub setting-sub-row">
        <div class="setting-info">
          <span class="setting-sublabel">{{ t('modelViewer.settings.fallbackLabel') }}</span>
          <p class="setting-desc">{{ t('modelViewer.settings.fallbackDesc') }}</p>
        </div>
        <ToggleSwitch v-model="modelPreview.onlineFallback" />
      </div>
    </div>

    <div class="setting-divider"></div>

    <!-- Debug -->
    <h3 class="setting-section-title">{{ t('settings.debugSection') }}</h3>

    <div class="setting-row">
      <div class="setting-info">
        <span class="setting-label">{{ t('settings.sqlDebug') }}</span>
        <p class="setting-desc">{{ t('settings.sqlDebugDesc') }}</p>
      </div>
      <ToggleSwitch
        :modelValue="debug.enabled"
        @update:modelValue="onToggleDebug"
      />
    </div>
  </Dialog>
</template>

<style scoped>
.setting-section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-soft);
  margin-bottom: 0.85rem;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.setting-row + .setting-row {
  margin-top: 1rem;
}

.setting-info {
  flex: 1;
}

.setting-label {
  font-weight: 500;
  color: var(--text);
  font-size: 0.95rem;
}

.setting-desc {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.setting-divider {
  height: 1px;
  background: var(--border-default);
  margin: 1.25rem 0;
}

.setting-block {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.setting-path-row {
  display: flex;
  gap: 0.5rem;
}

.setting-path-row :deep(.p-inputtext) {
  flex: 1;
}

.setting-sub {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.setting-sublabel {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-soft);
}

/* A sub-setting whose control sits beside its label rather than under it. */
.setting-sub-row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
</style>
