<script setup lang="ts">
import { ref, watch } from 'vue'
import { blpTextureUrl } from '@core/wow/assetHost'

/** The game's own quality colours. Not the `--quality-N` tokens: the light
 * theme darkens those for its pale surfaces, and this plate is always dark. */
const QUALITY_COLORS = ['#9d9d9d', '#ffffff', '#1eff00', '#0070dd', '#a335ee', '#ff8000', '#e6cc80', '#e6cc80']

/**
 * One reward / required-item slot: the icon button with its stack count, and
 * the name plate beside it. The name is tinted by item quality (a hint the
 * 3.3.5 frame doesn't give, but useful when editing).
 */
const props = defineProps<{
  name: string
  /** MPQ path of the icon BLP, '' when unknown. */
  icon: string
  count?: number
  /** Item quality 0-7; undefined for non-items (spells) and unknown items. */
  quality?: number
  /** The id didn't resolve (unknown in the database). */
  missing?: boolean
}>()

const failed = ref(false)
watch(() => props.icon, () => { failed.value = false })
</script>

<template>
  <div class="qp-slot" :class="{ missing }">
    <div class="qp-slot-icon">
      <img v-if="icon && !failed" :src="blpTextureUrl(icon)" alt="" draggable="false" @error="failed = true" />
      <span v-else class="qp-slot-fallback">?</span>
      <span v-if="count && count > 1" class="qp-slot-count">{{ count }}</span>
    </div>
    <span
      class="qp-slot-name"
      :style="quality != null ? { color: QUALITY_COLORS[quality] } : undefined"
    >{{ name }}</span>
  </div>
</template>

<style scoped>
.qp-slot {
  display: flex;
  align-items: center;
  min-width: 0;
}

.qp-slot-icon {
  position: relative;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  border-radius: 3px;
  background: #1b140c;
  box-shadow: 0 0 0 1px #000, 0 1px 3px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  z-index: 1;
}

.qp-slot-icon img {
  width: 100%;
  height: 100%;
  display: block;
}

.qp-slot-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffd100;
  font-weight: 700;
  font-size: 1rem;
  background: radial-gradient(circle at 50% 40%, #4a3a26, #1b140c);
}

.qp-slot-count {
  position: absolute;
  right: 2px;
  bottom: 0;
  color: #fff;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1;
  text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
}

/* The name plate tucks under the icon's right edge, like the client's
   UI-QuestItemNameFrame. */
.qp-slot-name {
  flex: 1;
  min-width: 0;
  margin-left: -3px;
  padding: 0.2rem 0.4rem 0.2rem 0.5rem;
  min-height: 1.7rem;
  display: flex;
  align-items: center;
  border-radius: 0 3px 3px 0;
  background: linear-gradient(90deg, rgba(40, 26, 12, 0.88), rgba(40, 26, 12, 0.55));
  color: #fff;
  font-size: 0.7rem;
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.missing .qp-slot-name {
  color: #ff5a4a !important;
}
</style>
