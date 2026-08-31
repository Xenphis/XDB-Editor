import { createI18n } from 'vue-i18n'
import fr from '@core/i18n/locales/fr.json'
import en from '@core/i18n/locales/en.json'
import { moduleI18nMessages, type AppLocale } from '@/modules/registry'

const STORAGE_KEY = 'isc.locale'

function readStoredLocale(): AppLocale {
  return localStorage.getItem(STORAGE_KEY) === 'fr' ? 'fr' : 'en'
}

const i18n = createI18n({
  legacy: false,
  locale: readStoredLocale(),
  fallbackLocale: 'en',
  messages: {
    fr,
    en,
  },
})

for (const { locale, messages } of moduleI18nMessages) {
  i18n.global.mergeLocaleMessage(locale, messages)
}

/** Switch the UI language and persist the choice across restarts. */
export function setLocale(next: AppLocale) {
  i18n.global.locale.value = next
  localStorage.setItem(STORAGE_KEY, next)
}

export default i18n
