<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMapEditorStore } from '@/modules/map_editor/store'
import { useModelPreviewStore } from '../store'
import { renderModel } from '../service'
import type { ModelKind, ModelPreviewSource, ModelViewerHandle } from '../types'

const props = defineProps<{
  kind: ModelKind
  displayId: number
}>()

const { t } = useI18n()
const store = useModelPreviewStore()
const mapEditor = useMapEditorStore()

type Status = 'loading' | 'ready' | 'empty' | 'error' | 'noClient'
const status = ref<Status>('empty')
/** Which source produced the picture on screen (badge, only when ready). */
const activeSource = ref<ModelPreviewSource>('local')

// Unique, selector-safe id so multiple viewers can coexist on one page.
const containerId = `model-viewer-${Math.random().toString(36).slice(2)}`
const canvasHost = ref<HTMLElement | null>(null)

let handle: ModelViewerHandle | null = null
// Guards against out-of-order async renders when props change rapidly.
let renderToken = 0

function clearContainer() {
  if (canvasHost.value) canvasHost.value.innerHTML = ''
}

function teardown() {
  if (handle) {
    handle.destroy()
    handle = null
  }
  clearContainer()
}

async function render() {
  teardown()
  const token = ++renderToken

  if (!props.displayId || props.displayId <= 0) {
    status.value = 'empty'
    return
  }
  const host = canvasHost.value
  if (!host) return
  // Local without a client and without the online fallback has nothing to
  // render from — say so instead of failing with a generic error.
  if (store.source === 'local' && !mapEditor.clientPath.trim() && !store.onlineFallback) {
    status.value = 'noClient'
    return
  }

  status.value = 'loading'
  try {
    const result = await renderModel({
      container: host,
      containerSelector: `#${containerId}`,
      kind: props.kind,
      displayId: props.displayId,
      clientPath: mapEditor.clientPath,
      preferred: store.source,
      onlineFallback: store.onlineFallback,
    })
    if (token !== renderToken) {
      // A newer render superseded this one — discard the stale viewer.
      result.destroy()
      return
    }
    handle = result
    activeSource.value = result.source
    status.value = 'ready'
  } catch (e) {
    if (token !== renderToken) return
    console.error('[ModelViewer] failed to render model', e)
    status.value = 'error'
  }
}

watch(
  () =>
    [
      props.kind,
      props.displayId,
      store.source,
      store.onlineFallback,
      mapEditor.clientPath,
    ] as const,
  () => {
    render()
  },
)

onMounted(render)
onBeforeUnmount(teardown)
</script>

<template>
  <div class="model-viewer">
    <!-- The viewer mounts its canvas here; kept always-present and sized. -->
    <div :id="containerId" ref="canvasHost" class="model-viewer-canvas"></div>

    <!-- Which source rendered this, so a fallback to the online database is
         visible rather than silent. -->
    <span v-if="status === 'ready'" class="model-viewer-source">
      {{ activeSource === 'local'
        ? t('modelViewer.source.local')
        : t('modelViewer.source.online') }}
    </span>

    <div v-if="status !== 'ready'" class="model-viewer-overlay">
      <template v-if="status === 'loading'">
        <i class="pi pi-spin pi-spinner model-viewer-icon"></i>
        <span class="model-viewer-label">{{ t('modelViewer.states.loading') }}</span>
      </template>

      <template v-else-if="status === 'empty'">
        <i class="pi pi-box model-viewer-icon"></i>
        <span class="model-viewer-label">{{ t('modelViewer.states.empty') }}</span>
      </template>

      <template v-else-if="status === 'noClient'">
        <i class="pi pi-folder-open model-viewer-icon"></i>
        <span class="model-viewer-label">{{ t('modelViewer.states.noClient') }}</span>
        <span class="model-viewer-hint">{{ t('modelViewer.states.noClientHint') }}</span>
      </template>

      <template v-else-if="status === 'error'">
        <i class="pi pi-exclamation-triangle model-viewer-icon"></i>
        <span class="model-viewer-label">{{ t('modelViewer.states.error') }}</span>
        <span class="model-viewer-hint">{{ t('modelViewer.states.errorHint') }}</span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.model-viewer {
  position: relative;
  /* Square: the Wowhead viewer always renders a square canvas sized to the
     container width. A non-square box would leave the model top-aligned with
     empty space below (or distort it if stretched). */
  aspect-ratio: 1 / 1;
  background:
    radial-gradient(120% 80% at 50% 0%, rgba(6, 182, 212, 0.08), transparent 70%),
    var(--surface-input);
  border: 1px solid var(--border-input);
  border-radius: 0.5rem;
  overflow: hidden;
}

.model-viewer-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* Both engines inject a <canvas> that should fill the container. object-fit
   keeps it undistorted and centered if its aspect ever differs. */
.model-viewer-canvas :deep(canvas) {
  width: 100% !important;
  height: 100% !important;
  object-fit: contain;
  display: block;
}

.model-viewer-source {
  position: absolute;
  right: 0.4rem;
  bottom: 0.4rem;
  padding: 0.1rem 0.4rem;
  border-radius: 0.3rem;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid var(--border-input);
  font-size: 0.62rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-placeholder);
  pointer-events: none;
}

.model-viewer-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 1rem;
  text-align: center;
  border: 1px dashed var(--border-input);
  border-radius: 0.5rem;
  background: var(--surface-input);
  color: var(--text-muted);
}

.model-viewer-icon {
  font-size: 2.75rem;
  color: var(--text-placeholder);
}

.model-viewer-label {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.model-viewer-hint {
  font-size: 0.72rem;
  color: var(--text-placeholder);
  line-height: 1.35;
  max-width: 16rem;
  word-break: break-word;
}
</style>
