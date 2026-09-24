<script setup lang="ts">
import { computed } from 'vue'
import { splitMoney } from '@/modules/quests/utils/questText'

/** The client's money frame: each non-zero denomination followed by its coin. */
const props = defineProps<{ copper: number }>()

const coins = computed(() => splitMoney(props.copper))
</script>

<template>
  <span class="qp-money">
    <span v-if="coins.gold" class="qp-coin-amount">{{ coins.gold }}<i class="qp-coin qp-coin-gold" /></span>
    <span v-if="coins.silver" class="qp-coin-amount">{{ coins.silver }}<i class="qp-coin qp-coin-silver" /></span>
    <span v-if="coins.copper || (!coins.gold && !coins.silver)" class="qp-coin-amount">{{ coins.copper }}<i class="qp-coin qp-coin-copper" /></span>
  </span>
</template>

<style scoped>
.qp-money {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.qp-coin-amount {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
}

.qp-coin {
  display: inline-block;
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.45), 0 1px 1px rgba(0, 0, 0, 0.3);
}

.qp-coin-gold { background: radial-gradient(circle at 35% 30%, #fff3b0, #f2c230 45%, #9c7212); }
.qp-coin-silver { background: radial-gradient(circle at 35% 30%, #ffffff, #c9ced3 45%, #6f767d); }
.qp-coin-copper { background: radial-gradient(circle at 35% 30%, #ffd2ae, #d0773c 45%, #7a3a12); }
</style>
