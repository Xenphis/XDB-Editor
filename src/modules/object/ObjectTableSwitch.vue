<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import SelectButton from 'primevue/selectbutton'

/**
 * Table switch sitting above the object list. The "Object" section is a single
 * page over two tables — item_template and gameobject_template — each keeping
 * its own route, store and editor; this only swaps which one is on screen.
 * Switching drops the current selection: the two tables share nothing but the
 * list frame.
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
    <SelectButton
      :modelValue="active"
      :options="options"
      optionLabel="label"
      optionValue="value"
      :allowEmpty="false"
      size="small"
      @update:modelValue="onChange"
    />
  </div>
</template>

<style scoped>
.object-switch {
  /* Right padding clears the workspace's absolutely positioned collapse
     toggle, which sits over this corner (same trick as the search header). */
  padding: 0.6rem 2.1rem 0 0.6rem;
  flex-shrink: 0;
}

/* Fill the list pane: two equal halves, like the map editor's table switch. */
.object-switch :deep(.p-selectbutton) {
  display: flex;
  width: 100%;
}

.object-switch :deep(.p-togglebutton) {
  flex: 1;
}

/* "Game Objects" / "Objets de jeu" must stay on one line: a wrapped label
   doubles the height of the whole switch. */
.object-switch :deep(.p-togglebutton-label) {
  white-space: nowrap;
}
</style>
