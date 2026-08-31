import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export type ThemeName = 'dark' | 'light'

const STORAGE_KEY = 'isc.theme'

function readStoredTheme(): ThemeName {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' ? 'light' : 'dark'
}

/**
 * Runtime theme switching. The `.dark` class on <html> drives both the app
 * tokens (tokens.css) and every PrimeVue token (darkModeSelector: '.dark'),
 * including overlays teleported to <body>. index.html ships with class="dark"
 * so the default theme never flashes light on boot.
 */
export const useThemeStore = defineStore('theme', () => {
  const theme = ref<ThemeName>(readStoredTheme())

  const isDark = computed(() => theme.value === 'dark')

  function apply() {
    document.documentElement.classList.toggle('dark', isDark.value)
  }

  function setTheme(next: ThemeName) {
    theme.value = next
    localStorage.setItem(STORAGE_KEY, next)
    apply()
  }

  function toggle() {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  // Sync the DOM with the persisted preference at store creation.
  apply()

  return { theme, isDark, setTheme, toggle }
})
