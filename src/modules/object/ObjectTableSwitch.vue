<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Select from 'primevue/select'

/**
 * Table picker sitting above the object list. The "Object" section is a single
 * page over two tables — item_template and gameobject_template — each keeping
 * its own route, store and editor; this only swaps which one is on screen.
 * Switching drops the current selection: the two tables share nothing but the
 * list frame. A dropdown, like the NPC, loot and spell pickers.
 */

type ObjectTable = 'item' | 'gameobject'

const ROUTES: Record<ObjectTable, string> = {
  item: '/object/item-template',
  gameobject: '/object/gameobject-template',
}

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const options = computed(() => [
  { label: t('object.tables.items'), value: 'item' as ObjectTable },
  { label: t('object.tables.gameObjects'), value: 'gameobject' as ObjectTable },
])

const active = computed<ObjectTable>(() =>
  route.path.startsWith(ROUTES.gameobject) ? 'gameobject' : 'item',
)

function onChange(value: ObjectTable) {
  if (value === active.value) return
  void router.push(ROUTES[value])
}
</script>

<template>
  <div class="object-switch">
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
.object-switch {
  /* Right padding clears the workspace's absolutely positioned collapse
     toggle, which sits over this corner (same as LootTypeSelect). */
  padding: 0.6rem 2.1rem 0 0.6rem;
  flex-shrink: 0;
}
</style>
