import { ref, watch, type Ref } from 'vue'
import { getNpc, getNpcResistances, getCreatureSpawn } from '@/modules/npc/service'
import type { CreatureTemplate } from '@/modules/npc/types/creature_template/creature_template'
import type { CreatureTemplateResistance } from '@/modules/npc/types/creature_template/creature_template_resistance'
import type { Creature } from '@/modules/npc/types/creature/creature'
import { getCreatureClassLevelStat } from '@/modules/class_level_stats/service'
import type { CreatureClassLevelStats } from '@/modules/class_level_stats/types'
import type { CreatureSpawnMarker } from './types'

/**
 * Full creature_template / creature rows behind the selected spawn. The 3D view
 * only streams a light marker, so the side panel loads the rest on selection.
 * Each part fails on its own (a spawn can lack a template row), and a stale
 * response from a previously selected spawn is dropped.
 */
export function useSpawnDetails(spawn: Ref<CreatureSpawnMarker | null>) {
  const template = ref<CreatureTemplate | null>(null)
  const resistances = ref<CreatureTemplateResistance[]>([])
  const row = ref<Creature | null>(null)
  /** Base stats at the template's lowest and highest level; null when missing. */
  const stats = ref<{ min: CreatureClassLevelStats; max: CreatureClassLevelStats } | null>(null)
  const loading = ref(false)

  watch(
    () => (spawn.value ? `${spawn.value.guid}:${spawn.value.id}` : null),
    async key => {
      template.value = null
      resistances.value = []
      row.value = null
      stats.value = null
      const current = spawn.value
      if (!key || !current) {
        loading.value = false
        return
      }

      loading.value = true
      const [tpl, res, creature] = await Promise.allSettled([
        getNpc(current.id),
        getNpcResistances(current.id),
        getCreatureSpawn(current.guid),
      ])
      if (spawn.value?.guid !== current.guid) return

      template.value = tpl.status === 'fulfilled' ? tpl.value : null
      resistances.value = res.status === 'fulfilled' ? res.value : []
      row.value = creature.status === 'fulfilled' ? creature.value : null

      // Health, mana, armor and damage are the class/level base times the
      // template's modifiers, so the real figures need that matrix row.
      if (template.value) {
        const { minlevel, maxlevel, unit_class } = template.value
        const [lo, hi] = await Promise.allSettled([
          getCreatureClassLevelStat(minlevel, unit_class),
          getCreatureClassLevelStat(maxlevel, unit_class),
        ])
        if (spawn.value?.guid !== current.guid) return
        if (lo.status === 'fulfilled' && hi.status === 'fulfilled') {
          stats.value = { min: lo.value, max: hi.value }
        }
      }
      loading.value = false
    },
    { immediate: true },
  )

  return { template, resistances, row, stats, loading }
}
