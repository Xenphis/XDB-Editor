<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import EditorHeader from '@core/components/EditorHeader.vue'
import { getQuestChain, type QuestChain, type QuestChainNode } from '@/modules/quests/service'

/**
 * Whole quest chain around `rootId` drawn as a top-down graph: each quest sits
 * one row below its deepest prerequisite. Clicking a node emits `open` so the
 * workspace switches to that quest's field editor.
 */

const props = defineProps<{
  rootId: number
  /** Quest IDs with unsaved edits, highlighted like in the list. */
  modifiedIds?: Set<number> | number[]
}>()

const emit = defineEmits<{
  (e: 'open', id: number): void
}>()

const { t } = useI18n()

const NODE_W = 200
const NODE_H = 54
const GAP_X = 28
const GAP_Y = 44
const PAD = 16

const chain = ref<QuestChain | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

watch(() => props.rootId, async (id) => {
  loading.value = true
  error.value = null
  try {
    chain.value = await getQuestChain(id)
  } catch (e) {
    chain.value = null
    error.value = String(e)
  } finally {
    loading.value = false
  }
}, { immediate: true })

interface PlacedNode extends QuestChainNode {
  x: number
  y: number
}

/** Layered layout: rank = longest path from a chain start; rows ordered by
 * the mean position of each node's parents to keep edges from crossing. */
const layout = computed(() => {
  const data = chain.value
  if (!data || data.nodes.length === 0) return null

  const parents = new Map<number, number[]>()
  const children = new Map<number, number[]>()
  for (const n of data.nodes) {
    parents.set(n.id, [])
    children.set(n.id, [])
  }
  for (const e of data.edges) {
    children.get(e.from)?.push(e.to)
    parents.get(e.to)?.push(e.from)
  }

  // Kahn's walk for ranks; nodes stuck in a cycle get placed after it.
  const rank = new Map<number, number>()
  const pending = new Map<number, number>()
  const queue: number[] = []
  for (const n of data.nodes) {
    pending.set(n.id, parents.get(n.id)!.length)
    if (pending.get(n.id) === 0) {
      rank.set(n.id, 0)
      queue.push(n.id)
    }
  }
  while (queue.length) {
    const id = queue.shift()!
    for (const c of children.get(id)!) {
      rank.set(c, Math.max(rank.get(c) ?? 0, rank.get(id)! + 1))
      pending.set(c, pending.get(c)! - 1)
      if (pending.get(c) === 0) queue.push(c)
    }
  }
  const maxRank = Math.max(0, ...rank.values())
  for (const n of data.nodes) {
    if (!rank.has(n.id)) rank.set(n.id, maxRank + 1)
  }

  const rows: number[][] = []
  for (const n of data.nodes) {
    const r = rank.get(n.id)!
    ;(rows[r] ??= []).push(n.id)
  }
  const order = new Map<number, number>()
  rows.forEach((row, r) => {
    if (r === 0) {
      // The quest the chain was opened from goes first.
      row.sort((a, b) => (a === props.rootId ? -1 : b === props.rootId ? 1 : a - b))
    } else {
      const bary = (id: number) => {
        const ps = parents.get(id)!.filter(p => order.has(p))
        return ps.length ? ps.reduce((s, p) => s + order.get(p)!, 0) / ps.length : Infinity
      }
      row.sort((a, b) => bary(a) - bary(b) || a - b)
    }
    row.forEach((id, i) => order.set(id, i))
  })

  // Each node goes under the mean x of its parents; a left-to-right sweep
  // then pushes overlapping nodes apart, and the row is shifted back so its
  // nodes stay centered on their parents on average.
  const STEP = NODE_W + GAP_X
  const xOf = new Map<number, number>()
  rows.forEach((row, r) => {
    const desired = row.map((id, i) => {
      const ps = parents.get(id)!.filter(p => xOf.has(p))
      if (r === 0 || ps.length === 0) return i * STEP
      return ps.reduce((sum, p) => sum + xOf.get(p)!, 0) / ps.length
    })
    const xs: number[] = []
    desired.forEach((d, i) => { xs.push(i === 0 ? d : Math.max(d, xs[i - 1]! + STEP)) })
    const drift = xs.reduce((sum, x, i) => sum + (x - desired[i]!), 0) / xs.length
    row.forEach((id, i) => xOf.set(id, xs[i]! - drift))
  })
  const minX = Math.min(...xOf.values())
  const maxX = Math.max(...xOf.values())
  const width = maxX - minX + NODE_W + PAD * 2
  const height = rows.length * NODE_H + (rows.length - 1) * GAP_Y + PAD * 2

  const byId = new Map(data.nodes.map(n => [n.id, n]))
  const placed = new Map<number, PlacedNode>()
  rows.forEach((row, r) => {
    for (const id of row) {
      placed.set(id, { ...byId.get(id)!, x: xOf.get(id)! - minX + PAD, y: PAD + r * (NODE_H + GAP_Y) })
    }
  })

  const edges = data.edges.map(e => {
    const a = placed.get(e.from)!
    const b = placed.get(e.to)!
    const x1 = a.x + NODE_W / 2
    const y1 = a.y + NODE_H
    const x2 = b.x + NODE_W / 2
    const y2 = b.y
    const bend = Math.max(GAP_Y / 2, Math.abs(y2 - y1) / 2)
    return {
      key: `${e.from}-${e.to}`,
      kind: e.kind,
      d: `M ${x1} ${y1} C ${x1} ${y1 + bend}, ${x2} ${y2 - bend}, ${x2} ${y2 - 4}`,
    }
  })

  return { nodes: [...placed.values()], edges, width, height }
})

const rootTitle = computed(() =>
  chain.value?.nodes.find(n => n.id === props.rootId)?.title || undefined)

const modified = computed(() => new Set(props.modifiedIds ?? []))

function levelOf(n: QuestChainNode): string {
  if (n.level == null) return ''
  return n.level === -1 ? t('quest.chainView.scaling') : t('quest.chainView.level', { level: n.level })
}
</script>

<template>
  <div class="quest-chain-view">
    <EditorHeader
      :title="t('quest.chainView.title')"
      :subtitle="rootTitle"
      :id="rootId"
      :showBack="false"
      :showDiscard="false"
      :showExecute="false"
    />

    <div class="chain-toolbar">
      <span v-if="chain">{{ t('quest.chainView.count', { count: chain.nodes.length }) }}</span>
      <span class="legend">
        <svg width="28" height="8"><line x1="0" y1="4" x2="28" y2="4" class="edge completed" /></svg>
        {{ t('quest.chainView.completed') }}
      </span>
      <span class="legend">
        <svg width="28" height="8"><line x1="0" y1="4" x2="28" y2="4" class="edge active" /></svg>
        {{ t('quest.chainView.active') }}
      </span>
      <span class="hint">{{ t('quest.chainView.hint') }}</span>
    </div>

    <p v-if="chain?.truncated" class="chain-warning">
      <i class="pi pi-exclamation-triangle"></i> {{ t('quest.chainView.truncated') }}
    </p>

    <div v-if="loading" class="chain-state"><i class="pi pi-spin pi-spinner"></i></div>
    <div v-else-if="error" class="chain-state chain-error">{{ error }}</div>

    <div v-else-if="layout" class="chain-canvas">
      <div class="chain-graph" :style="{ width: `${layout.width}px`, height: `${layout.height}px` }">
        <svg class="chain-edges" :width="layout.width" :height="layout.height">
          <defs>
            <marker id="chain-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" class="arrow" />
            </marker>
          </defs>
          <path
            v-for="e in layout.edges"
            :key="e.key"
            :d="e.d"
            class="edge"
            :class="e.kind"
            marker-end="url(#chain-arrow)"
          />
        </svg>

        <button
          v-for="n in layout.nodes"
          :key="n.id"
          type="button"
          class="chain-node"
          :class="{ root: n.id === rootId, missing: n.title === null, modified: modified.has(n.id) }"
          :style="{ left: `${n.x}px`, top: `${n.y}px`, width: `${NODE_W}px`, height: `${NODE_H}px` }"
          :disabled="n.title === null"
          :title="n.title ?? undefined"
          @click="emit('open', n.id)"
        >
          <span class="node-title">{{ n.title === null ? t('quest.chainView.missing') : (n.title || `#${n.id}`) }}</span>
          <span class="node-meta">
            #{{ n.id }}<template v-if="levelOf(n)"> · {{ levelOf(n) }}</template>
            <span
              v-if="n.exclusive_group !== 0"
              class="node-group"
              v-tooltip.bottom="t(n.exclusive_group > 0 ? 'quest.chainView.groupOne' : 'quest.chainView.groupAll', { group: Math.abs(n.exclusive_group) })"
            >{{ n.exclusive_group > 0 ? '⇄' : '＋' }} {{ Math.abs(n.exclusive_group) }}</span>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quest-chain-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.chain-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 1.1rem;
  margin-bottom: 0.75rem;
  font-size: var(--font-label);
  color: var(--text-muted);
}

.legend {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.hint {
  margin-left: auto;
}

.chain-warning {
  margin-bottom: 0.75rem;
  font-size: var(--font-label);
  color: var(--danger);
}

.chain-state {
  display: flex;
  justify-content: center;
  padding: 3rem 0;
  color: var(--accent);
  font-size: 1.5rem;
}

.chain-error {
  font-size: var(--font-field);
  color: var(--danger);
}

.chain-canvas {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: var(--surface-panel);
}

.chain-graph {
  position: relative;
  /* Centered while narrower than the canvas, scrollable once wider. */
  margin: 0 auto;
}

.chain-edges {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.edge {
  fill: none;
  stroke: var(--text-muted);
  stroke-width: 1.5;
}

.edge.active {
  stroke-dasharray: 5 4;
}

.arrow {
  fill: var(--text-muted);
}

.chain-node {
  position: absolute;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.15rem;
  padding: 0.35rem 0.65rem;
  border: 1px solid var(--border-default);
  border-radius: var(--radius);
  background: var(--surface-base);
  color: var(--text);
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.chain-node:hover {
  border-color: var(--accent-focus);
  background: var(--accent-soft);
}

.chain-node.root {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-ring);
}

.chain-node.modified .node-title::after {
  content: ' •';
  color: var(--accent);
}

.chain-node.missing {
  border-style: dashed;
  color: var(--text-muted);
  cursor: default;
  background: transparent;
}

.node-title {
  font-size: var(--font-field);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: var(--font-label);
  color: var(--text-muted);
  white-space: nowrap;
}

.node-group {
  margin-left: auto;
  padding: 0 0.3rem;
  border-radius: 0.25rem;
  background: var(--accent-soft);
  color: var(--accent);
}
</style>
