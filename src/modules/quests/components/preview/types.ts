/** One slot of the preview's item grids (rewards, required items, reward spell). */
export interface PreviewSlot {
  key: string
  name: string
  /** MPQ path of the icon BLP, '' when unknown. */
  icon: string
  count?: number
  quality?: number
  missing?: boolean
}

/** What the "Rewards" block of the quest frame lists. */
export interface PreviewRewards {
  choices: PreviewSlot[]
  items: PreviewSlot[]
  /** Copper; only positive amounts are a reward (negative = required money). */
  money: number
  spell: (PreviewSlot & { aura: boolean }) | null
  honor: number
  arena: number
  talents: number
  title: number
}
