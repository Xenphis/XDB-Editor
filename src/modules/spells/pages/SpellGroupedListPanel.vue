<script setup lang="ts">
/**
 * The spells list: single-rank spells render as an ordinary row, multi-rank
 * ones collapse under one expandable header ("N ranks") — MangosSuperUI's
 * spell browser does the same thing to keep a 16-rank chain from drowning
 * the list.
 *
 * A dedicated component rather than `EntityListPanel` itself: rank grouping
 * is a spells-only concept, and it owns its row markup directly (icon +
 * title) instead of going through a slot, which sidesteps the
 * cross-component scoped-CSS duplication a slot-based approach would need.
 */
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import { blpTextureUrl } from '@core/wow/assetHost'
import type { SpellInfo } from '@core/wow/spellDbc'
import type { SpellRankGroup } from './useSpellRankGroups'

const props = withDefaults(defineProps<{
  groups: SpellRankGroup[]
  selectedId?: number | null
  modifiedIds?: Set<number>
  loading?: boolean
  searchPlaceholder?: string
}>(), {
  selectedId: null,
  loading: false,
})

const emit = defineEmits<{
  (e: 'select', item: SpellInfo): void
  (e: 'search', query: string): void
}>()

const { t } = useI18n()
const search = ref('')

let debounceTimer: ReturnType<typeof setTimeout> | undefined
watch(search, value => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => emit('search', value), 300)
})

/** Group keys currently expanded — collapsed by default, like MangosSuperUI. */
const expanded = ref(new Set<string>())

function toggleGroup(key: string) {
  const next = new Set(expanded.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expanded.value = next
}

/** Spells with no icon, or a BLP the decoder choked on, just show no image. */
function hideBrokenIcon(event: Event) {
  ;(event.target as HTMLImageElement).style.visibility = 'hidden'
}
</script>

<template>
  <div class="entity-list">
    <div class="entity-list-header">
      <div class="entity-list-search">
        <i class="pi pi-search"></i>
        <InputText
          v-model="search"
          :placeholder="searchPlaceholder ?? t('workspace.searchPlaceholder')"
          class="entity-list-search-input"
          fluid
        />
      </div>
      <slot name="filters" />
    </div>

    <div class="entity-list-rows">
      <div v-if="loading" class="entity-list-loading">
        <i class="pi pi-spin pi-spinner"></i>
      </div>

      <template v-else>
        <template v-for="group in props.groups" :key="group.key">
          <!-- Single rank: an ordinary row, no group chrome. -->
          <button
            v-if="group.entries.length === 1"
            class="entity-row"
            :class="{ selected: group.entries[0]!.id === props.selectedId }"
            @click="emit('select', group.entries[0]!)"
          >
            <img
              v-if="group.entries[0]!.icon"
              class="spell-row-icon"
              :src="blpTextureUrl(group.entries[0]!.icon)"
              alt=""
              @error="hideBrokenIcon"
            />
            <span v-else class="spell-row-icon-placeholder"></span>
            <span class="entity-row-main">
              <span class="entity-row-title">
                {{ group.name }}
                <span v-if="modifiedIds?.has(group.entries[0]!.id)" class="entity-row-dot" aria-hidden="true" />
              </span>
              <span v-if="group.entries[0]!.rank" class="entity-row-meta">{{ group.entries[0]!.rank }}</span>
            </span>
          </button>

          <!-- Multiple ranks: collapsible header + indented rank rows. -->
          <template v-else>
            <button class="entity-row spell-group-header" @click="toggleGroup(group.key)">
              <img
                v-if="group.entries[0]!.icon"
                class="spell-row-icon"
                :src="blpTextureUrl(group.entries[0]!.icon)"
                alt=""
                @error="hideBrokenIcon"
              />
              <span v-else class="spell-row-icon-placeholder"></span>
              <span class="entity-row-main">
                <span class="entity-row-title">{{ group.name }}</span>
              </span>
              <span class="spell-group-count">{{ t('spells.rankCount', group.entries.length) }}</span>
            </button>

            <div v-if="expanded.has(group.key)" class="spell-group-members">
              <button
                v-for="entry in group.entries"
                :key="entry.id"
                class="entity-row spell-group-member"
                :class="{ selected: entry.id === props.selectedId }"
                @click="emit('select', entry)"
              >
                <span class="entity-row-main">
                  <span class="entity-row-title">
                    {{ entry.rank || `#${entry.id}` }}
                    <span v-if="modifiedIds?.has(entry.id)" class="entity-row-dot" aria-hidden="true" />
                  </span>
                </span>
              </button>
            </div>
          </template>
        </template>

        <div v-if="props.groups.length === 0" class="entity-list-empty">
          {{ t('workspace.noResults') }}
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* Search box, row, title/meta/dot: identical to EntityListPanel — this
   component intentionally mirrors its look, see the file doc comment above. */
.entity-list {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}

.entity-list-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem;
  padding-right: 2.1rem;
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}

.entity-list-search {
  position: relative;
  flex: 1;
  min-width: 0;
}

.entity-list-search > i {
  position: absolute;
  left: 0.6rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.75rem;
  color: var(--text-placeholder);
  pointer-events: none;
}

.entity-list-search-input {
  padding-left: 1.8rem !important;
  height: var(--input-height-sm) !important;
  font-size: 0.8rem !important;
}

.entity-list-rows {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.35rem;
}

.entity-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.45rem 0.6rem;
  border: none;
  border-left: 2px solid transparent;
  border-radius: var(--radius);
  background: none;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.1s;
}

.entity-row:hover {
  background: var(--surface-hover);
}

.entity-row.selected {
  background: var(--accent-soft);
  border-left-color: var(--accent);
}

.entity-row-main {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
  flex: 1;
}

.entity-row-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entity-row.selected .entity-row-title {
  color: var(--accent);
}

.entity-row-dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-ring);
  flex-shrink: 0;
}

.entity-row-meta {
  font-size: 0.72rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entity-list-loading {
  display: flex;
  justify-content: center;
  padding: 1.5rem 0;
  color: var(--accent);
}

.entity-list-empty {
  padding: 1.25rem 0.5rem;
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-placeholder);
  font-style: italic;
}

/* Spell-specific additions */
.spell-row-icon,
.spell-row-icon-placeholder {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.25rem;
  flex-shrink: 0;
}

.spell-row-icon-placeholder {
  background: var(--surface-elevated);
}

.spell-group-count {
  flex-shrink: 0;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--surface-elevated);
  border-radius: 999px;
  padding: 0.15rem 0.5rem;
}

.spell-group-members {
  display: flex;
  flex-direction: column;
}

.spell-group-member {
  padding-left: 3rem;
}

.spell-group-member .entity-row-title {
  font-weight: 500;
  color: var(--text-soft);
}

.spell-group-member.selected .entity-row-title {
  color: var(--accent);
  font-weight: 600;
}
</style>
