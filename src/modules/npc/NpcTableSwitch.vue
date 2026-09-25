<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Select from 'primevue/select'

/**
 * Type picker sitting above the NPC list, in the same spot as the Object
 * section's `ObjectTableSwitch`. The NPC section is one page over four
 * editors — creature template, vendor, trainer and formation — each keeping its
 * own route, store and workspace; this only swaps which one is on screen.
 * Switching drops the current selection but not the pending edits: each type
 * keeps its own store.
 *
 * A dropdown rather than a SelectButton: four labels don't fit a toggle strip
 * in the list pane. No `size` prop on purpose, see `LootTypeSelect`.
 */

type NpcTable = 'creatureTemplate' | 'vendor' | 'trainer' | 'formation'

const ROUTES: Record<NpcTable, string> = {
  creatureTemplate: '/npc/creature-template',
  vendor: '/npc/vendor',
  trainer: '/npc/trainer',
  formation: '/npc/formation',
}

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const options = computed(() =>
  (Object.keys(ROUTES) as NpcTable[]).map(value => ({
    value,
    label: t(`npc.tables.${value}`),
  })),
)

const active = computed<NpcTable>(() =>
  (Object.keys(ROUTES) as NpcTable[]).find(key => route.path.startsWith(ROUTES[key]))
  ?? 'creatureTemplate',
)

function onChange(value: NpcTable) {
  if (value === active.value) return
  void router.push(ROUTES[value])
}
</script>

<template>
  <div class="npc-switch">
    <Select
      :modelValue="active"
      :options="options"
      optionLabel="label"
      optionValue="value"
      fluid
      @update:modelValue="onChange"
    />
  </div>
</template>

<style scoped>
.npc-switch {
  /* Right padding clears the workspace's absolutely positioned collapse
     toggle, which sits over this corner (same as ObjectTableSwitch). */
  padding: 0.6rem 2.1rem 0 0.6rem;
  flex-shrink: 0;
}
</style>
