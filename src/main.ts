import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Tooltip from 'primevue/tooltip'
import Aura from '@primeuix/themes/aura'
import { definePreset } from '@primeuix/themes'
import 'primeicons/primeicons.css'
import '@/style.css'
import App from '@/App.vue'
import i18n from '@core/i18n'
import router from '@core/router'
import { useThemeStore } from '@core/stores/themeStore'

const TrinityPreset = definePreset(Aura, {
  primitive: {
    // Light-theme brand ramps (crème surfaces + vermilion accent).
    vermilion: {
      50: '#fdf3ef',
      100: '#fbe4da',
      200: '#f6c6b4',
      300: '#efa088',
      400: '#e06345',
      500: '#d24a2b',
      600: '#b93a1f',
      700: '#9a3019',
      800: '#7c2917',
      900: '#662416',
      950: '#371007'
    },
    creme: {
      50: '#faf8f4',
      100: '#f2ede3',
      200: '#e9e1d2',
      300: '#d9cfba',
      400: '#b5a88e',
      500: '#83765f',
      600: '#5f5544',
      700: '#4c4133',
      800: '#3a3226',
      900: '#2b2218',
      950: '#1c160e'
    }
  },
  semantic: {
    primary: {
      50: '{cyan.50}',
      100: '{cyan.100}',
      200: '{cyan.200}',
      300: '{cyan.300}',
      400: '{cyan.400}',
      500: '{cyan.500}',
      600: '{cyan.600}',
      700: '{cyan.700}',
      800: '{cyan.800}',
      900: '{cyan.900}',
      950: '{cyan.950}'
    },
    colorScheme: {
      light: {
        // Crème surfaces + vermilion accent — mirrors :root tokens in tokens.css.
        surface: {
          0: '#ffffff',
          50: '{creme.50}',
          100: '{creme.100}',
          200: '{creme.200}',
          300: '{creme.300}',
          400: '{creme.400}',
          500: '{creme.500}',
          600: '{creme.600}',
          700: '{creme.700}',
          800: '{creme.800}',
          900: '{creme.900}',
          950: '{creme.950}'
        },
        primary: {
          color: '{vermilion.600}',
          contrastColor: '#ffffff',
          hoverColor: '{vermilion.700}',
          activeColor: '{vermilion.800}'
        },
        highlight: {
          background: '{vermilion.50}',
          focusBackground: '{vermilion.100}',
          color: '{vermilion.700}',
          focusColor: '{vermilion.800}'
        },
        formField: {
          background: '#ffffff',
          disabledBackground: '{creme.100}',
          borderColor: 'rgba(72, 60, 42, 0.22)',
          hoverBorderColor: '{vermilion.400}',
          focusBorderColor: '{vermilion.600}',
          color: '{creme.900}',
          placeholderColor: '{creme.400}'
        }
      },
      dark: {
        // Align PrimeVue dark surfaces (drawers, dialogs, overlays) with the
        // app's slate-blue design instead of the default zinc.
        surface: {
          0: '#ffffff',
          50: '{slate.50}',
          100: '{slate.100}',
          200: '{slate.200}',
          300: '{slate.300}',
          400: '{slate.400}',
          500: '{slate.500}',
          600: '{slate.600}',
          700: '{slate.700}',
          800: '{slate.800}',
          900: '{slate.900}',
          950: '{slate.950}'
        },
        primary: {
          color: '{cyan.400}',
          contrastColor: '{slate.950}',
          hoverColor: '{cyan.300}',
          activeColor: '{cyan.200}'
        },
        highlight: {
          background: 'rgba(6, 182, 212, 0.16)',
          focusBackground: 'rgba(6, 182, 212, 0.24)',
          color: 'rgba(255, 255, 255, 0.87)',
          focusColor: 'rgba(255, 255, 255, 0.87)'
        },
        formField: {
          background: 'rgba(15, 23, 42, 0.8)',
          disabledBackground: 'rgba(15, 23, 42, 0.7)',
          borderColor: 'rgba(51, 65, 85, 0.6)',
          hoverBorderColor: '{cyan.500}',
          focusBorderColor: '{cyan.400}',
          color: '{slate.200}',
          placeholderColor: '{slate.600}'
        }
      }
    }
  }
})

const app = createApp(App)

app.use(createPinia())
// Apply the persisted theme before mount so there is no wrong-theme flash.
useThemeStore()
app.use(router)
app.use(i18n)
app.use(PrimeVue, {
  theme: {
    preset: TrinityPreset,
    options: {
      // Must be a class selector matched by <html class="dark"> (index.html).
      // A bare element selector like 'html' is treated as a "custom" rule by
      // @primeuix and generates `html { :root { ... } }`, which never matches:
      // dark tokens silently stay off and every overlay renders light.
      darkModeSelector: '.dark',
      cssLayer: false
    }
  }
})
app.directive('tooltip', Tooltip)

app.mount('#app')
