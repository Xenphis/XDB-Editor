<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormationMemberEntry } from '@/modules/npc/stores/formationStore'

const { t } = useI18n()

const props = defineProps<{
  members: FormationMemberEntry[]
  leaderGuid: number
}>()

const emit = defineEmits<{
  (e: 'move', memberGUID: number, dist: number, angle: number): void
}>()

// Top-down view: the leader sits at the centre facing up (screen -Y).
const SIZE = 260
const CENTER = SIZE / 2
const PADDING = 26

/**
 * TrinityCore stores `angle` in degrees and adds 180° when placing the member
 * (CreatureGroups.cpp: `angle = FollowAngle + M_PI`), so a stored 0 puts the
 * member *behind* the leader. Angles grow counter-clockwise, as everywhere in
 * the WoW coordinate system.
 */
function toScreen(dist: number, angle: number, scale: number) {
  const phi = ((angle + 180) * Math.PI) / 180
  return {
    x: CENTER - dist * scale * Math.sin(phi),
    y: CENTER - dist * scale * Math.cos(phi),
  }
}

function fromScreen(x: number, y: number, scale: number) {
  const dx = x - CENTER
  const dy = y - CENTER
  const dist = Math.hypot(dx, dy) / scale
  const phi = (Math.atan2(-dx, -dy) * 180) / Math.PI
  // `dist` and `angle` are `float unsigned` columns: keep the angle in [0, 360).
  const angle = (phi - 180 + 360) % 360
  return { dist, angle }
}

const followers = computed(() => props.members.filter(m => m.memberGUID !== props.leaderGuid))

const maxDist = computed(() => Math.max(1, ...followers.value.map(m => m.dist || 0)))

/** Pixels per yard — the widest member always lands on the outer ring. */
const scale = computed(() => (CENTER - PADDING) / maxDist.value)

const rings = computed(() => [maxDist.value / 2, maxDist.value])

const plotted = computed(() => followers.value.map(m => ({
  member: m,
  ...toScreen(m.dist || 0, m.angle || 0, scale.value),
})))

const svgRef = ref<SVGSVGElement | null>(null)
const draggingGuid = ref<number | null>(null)

function pointerPosition(event: PointerEvent) {
  const svg = svgRef.value
  if (!svg) return null
  const rect = svg.getBoundingClientRect()
  return {
    x: ((event.clientX - rect.left) / rect.width) * SIZE,
    y: ((event.clientY - rect.top) / rect.height) * SIZE,
  }
}

function onPointerDown(event: PointerEvent, memberGUID: number) {
  draggingGuid.value = memberGUID
  ;(event.target as Element).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (draggingGuid.value == null) return
  const position = pointerPosition(event)
  if (!position) return
  const { dist, angle } = fromScreen(position.x, position.y, scale.value)
  emit('move', draggingGuid.value, Math.round(dist * 100) / 100, Math.round(angle * 100) / 100)
}

function onPointerUp(event: PointerEvent) {
  if (draggingGuid.value == null) return
  ;(event.target as Element).releasePointerCapture(event.pointerId)
  draggingGuid.value = null
}

function shortLabel(member: FormationMemberEntry): string {
  return member.name ?? `#${member.memberGUID}`
}
</script>

<template>
  <div class="formation-preview">
    <svg
      ref="svgRef"
      class="formation-preview-canvas"
      :viewBox="`0 0 ${SIZE} ${SIZE}`"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
    >
      <circle
        v-for="ring in rings"
        :key="ring"
        :cx="CENTER"
        :cy="CENTER"
        :r="ring * scale"
        class="preview-ring"
      />
      <line :x1="CENTER" :y1="PADDING / 2" :x2="CENTER" :y2="SIZE - PADDING / 2" class="preview-axis" />
      <line :x1="PADDING / 2" :y1="CENTER" :x2="SIZE - PADDING / 2" :y2="CENTER" class="preview-axis" />

      <!-- The leader faces up: 180° in the table is straight ahead. -->
      <text :x="CENTER + 4" :y="PADDING / 2 + 8" class="preview-axis-label">180°</text>
      <text :x="CENTER + 4" :y="SIZE - PADDING / 2 - 2" class="preview-axis-label">0°</text>
      <text :x="SIZE - PADDING / 2 - 18" :y="CENTER - 5" class="preview-axis-label">90°</text>
      <text :x="PADDING / 2" :y="CENTER - 5" class="preview-axis-label">270°</text>

      <line
        v-for="item in plotted"
        :key="`link-${item.member.memberGUID}`"
        :x1="CENTER"
        :y1="CENTER"
        :x2="item.x"
        :y2="item.y"
        class="preview-link"
      />

      <g class="preview-leader">
        <circle :cx="CENTER" :cy="CENTER" r="11" />
        <text :x="CENTER" :y="CENTER + 3">L</text>
      </g>

      <g
        v-for="item in plotted"
        :key="item.member.memberGUID"
        class="preview-member"
        :class="{ dragging: draggingGuid === item.member.memberGUID }"
        @pointerdown="onPointerDown($event, item.member.memberGUID)"
      >
        <circle :cx="item.x" :cy="item.y" r="9" />
        <title>{{ shortLabel(item.member) }} — {{ item.member.dist }} / {{ item.member.angle }}°</title>
      </g>
    </svg>

    <p class="formation-preview-hint">{{ t('formation.preview.hint') }}</p>
  </div>
</template>

<style scoped>
.formation-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.formation-preview-canvas {
  width: 100%;
  max-width: 260px;
  height: auto;
  touch-action: none;
}

.preview-ring,
.preview-axis {
  fill: none;
  stroke: var(--border-default);
  stroke-width: 1;
}

.preview-axis-label {
  fill: var(--text-placeholder);
  font-size: 9px;
}

.preview-link {
  stroke: var(--accent-focus);
  stroke-width: 1;
}

.preview-leader circle {
  fill: var(--accent);
}

.preview-leader text {
  fill: var(--accent-contrast);
  font-size: 10px;
  font-weight: 600;
  text-anchor: middle;
}

.preview-member circle {
  fill: var(--surface-input);
  stroke: var(--accent);
  stroke-width: 1.5;
  cursor: grab;
}

.preview-member.dragging circle {
  cursor: grabbing;
  fill: var(--accent-ring);
}

.formation-preview-hint {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin: 0;
  text-align: center;
}
</style>
