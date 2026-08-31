import { reactive, ref, markRaw, type Ref, type UnwrapRef } from 'vue'
import { generateUpsertQuery, getChangedFields, type FieldChange } from '@core/composables/useQueryGenerator'
import { generateCompositeKeyDiffStatements, type CompositeKeyConfig } from '@core/composables/useQueryGenerator'

// ─── Common interface ────────────────────────────────────────────────

export interface SubTableSnapshot {
  new: unknown
  original: unknown
}

export interface SubTableManager {
  /** Table name for session-tracker snapshot identification */
  readonly tableName: string
  /** Take a snapshot for the dirty cache */
  snapshot(): SubTableSnapshot
  /** Restore from a cached snapshot */
  restore(cached: SubTableSnapshot): void
  /** Reset to default values (new entry) */
  reset(): void
  /** Load data from DB: sets both draft (newEntry) and reference (originalEntry) */
  load(data: unknown): void
  /** Set original = current (after save) */
  commit(): void
  /** Revert draft to original values (keep original reference intact) */
  revert(): void
  /** Generate diff SQL for a given parent entry */
  getSqlDiff(parentId: number): string
  /** Generate diff SQL as individual statements (for transactional execution) */
  getSqlDiffStatements(parentId: number): string[]
  /** Get list of changed fields for display */
  getChangedFields(parentId: number): FieldChange[]
  /** Reactive live draft (newEntry / newEntries ref) — deep-watch source for session tracking */
  getLive(): object
  /** Plain clone of the live draft, for session snapshots */
  cloneLive(): unknown
  /** Plain clone of the DB reference; null when absent */
  cloneOriginal(): unknown | null
  /**
   * Pure diff statements between two plain snapshots. A null original means
   * the parent entity did not exist (diff against defaults / empty list); a
   * null current means the parent entity was deleted (no sub-table SQL — the
   * delete commands only remove the main row).
   */
  buildStatements(original: unknown | null, current: unknown | null, parentId: number): string[]
  /** Pure display field-changes between two plain snapshots (same conventions) */
  buildFieldChanges(original: unknown | null, current: unknown | null, parentId: number): FieldChange[]
}

// ─── ReactiveSubTable: single-row sub-tables (movement, addon, resistance) ──

export interface ReactiveSubTableConfig<T extends object> {
  tableName: string
  primaryKey: string
  createDefault: () => T
  /** For resistance-like tables that need composite key SQL instead of UPDATE */
  compositeConfig?: Omit<CompositeKeyConfig<any>, 'parentId'>
  /** Convert reactive form to rows for composite key SQL (resistance only) */
  toRows?: (form: T) => any[]
}

export class ReactiveSubTable<T extends object> implements SubTableManager {
  readonly tableName: string
  readonly primaryKey: string
  /** The editable draft (v-model target) */
  readonly newEntry: UnwrapRef<T>
  /** The database reference (diff base) */
  readonly originalEntry: Ref<T | null>
  private readonly createDefault: () => T
  private readonly compositeConfig?: Omit<CompositeKeyConfig<any>, 'parentId'>
  private readonly toRows?: (form: T) => any[]

  constructor(config: ReactiveSubTableConfig<T>) {
    this.tableName = config.tableName
    this.primaryKey = config.primaryKey
    this.createDefault = config.createDefault
    this.compositeConfig = config.compositeConfig
    this.toRows = config.toRows
    this.newEntry = reactive<T>(config.createDefault()) as UnwrapRef<T>
    this.originalEntry = ref<T | null>(null) as Ref<T | null>
    markRaw(this)
  }

  snapshot(): SubTableSnapshot {
    return {
      new: { ...(this.newEntry as any) },
      original: this.originalEntry.value ? { ...this.originalEntry.value } : { ...(this.newEntry as any) },
    }
  }

  restore(cached: SubTableSnapshot): void {
    Object.assign(this.newEntry as any, cached.new)
    this.originalEntry.value = { ...(cached.original as T) }
  }

  reset(): void {
    this.originalEntry.value = null
    Object.assign(this.newEntry as any, this.createDefault())
  }

  load(data: T): void {
    this.setNewEntry(data)
    this.commit()
  }

  revert(): void {
    if (this.originalEntry.value) {
      Object.assign(this.newEntry as any, this.originalEntry.value)
    } else {
      Object.assign(this.newEntry as any, this.createDefault())
    }
  }

  commit(): void {
    this.originalEntry.value = { ...(this.newEntry as any) } as T
  }

  getOriginalEntry(): T | null {
    return this.originalEntry.value
  }

  setOriginalEntry(data: T): void {
    this.originalEntry.value = { ...data }
  }

  setNewEntry(data: Partial<T>): void {
    Object.assign(this.newEntry as any, data)
  }

  getSqlDiff(parentId: number): string {
    return this.getSqlDiffStatements(parentId).join('\n')
  }

  getSqlDiffStatements(parentId: number): string[] {
    if (!this.originalEntry.value) {
      return []
    }
    return this.buildStatements(this.originalEntry.value, { ...(this.newEntry as any) }, parentId)
  }

  getChangedFields(parentId: number): FieldChange[] {
    if (!this.originalEntry.value) {
      return []
    }
    return this.buildFieldChanges(this.originalEntry.value, { ...(this.newEntry as any) }, parentId)
  }

  getLive(): object {
    return this.newEntry as object
  }

  cloneLive(): unknown {
    return { ...(this.newEntry as any) }
  }

  cloneOriginal(): unknown | null {
    return this.originalEntry.value ? { ...this.originalEntry.value } : null
  }

  buildStatements(original: unknown | null, current: unknown | null, parentId: number): string[] {
    if (current == null) {
      return []
    }
    const base = (original ?? this.createDefault()) as T
    const draft = current as T
    if (this.compositeConfig && this.toRows) {
      return generateCompositeKeyDiffStatements(
        { ...this.compositeConfig, parentId },
        this.toRows(base),
        this.toRows(draft),
      )
    }
    // Inject the parent ID as the primary key value
    const originalWithKey = { ...base, [this.primaryKey]: parentId } as Record<string, unknown>
    const currentWithKey = { ...draft, [this.primaryKey]: parentId } as Record<string, unknown>
    const changed = getChangedFields(originalWithKey, currentWithKey, this.primaryKey)
    if (changed.length === 0) {
      return []
    }
    // Upsert instead of UPDATE: the row may not exist in the database yet
    // (commitWhenMissing bindings), in which case an UPDATE would no-op.
    return [generateUpsertQuery(this.tableName, currentWithKey, changed.map(c => c.field))]
  }

  buildFieldChanges(original: unknown | null, current: unknown | null, _parentId: number): FieldChange[] {
    if (current == null) {
      return []
    }
    const base = (original ?? this.createDefault()) as T
    const draft = current as T
    if (this.compositeConfig && this.toRows) {
      const origRows = this.toRows(base)
      const curRows = this.toRows(draft)
      const changes: FieldChange[] = []
      const origMap = new Map(origRows.map((r: any) => [r[this.compositeConfig!.childKey], r]))
      const curMap = new Map(curRows.map((r: any) => [r[this.compositeConfig!.childKey], r]))
      for (const [key, orig] of origMap) {
        const cur = curMap.get(key)
        if (!cur || !this.compositeConfig!.isEqual(orig, cur)) {
          changes.push({ field: `${this.compositeConfig!.childKey}_${key}`, oldValue: orig, newValue: cur ?? '(deleted)' })
        }
      }
      for (const [key, cur] of curMap) {
        if (!origMap.has(key)) {
          changes.push({ field: `${this.compositeConfig!.childKey}_${key}`, oldValue: '(none)', newValue: cur })
        }
      }
      return changes
    }
    return getChangedFields(
      base as unknown as Record<string, unknown>,
      draft as unknown as Record<string, unknown>,
      this.primaryKey,
    )
  }
}

// ─── ArraySubTable: multi-row sub-tables (locales, equips, spells) ──

export interface ArraySubTableConfig<T extends Record<string, any>> {
  tableName: string
  compositeConfig: Omit<CompositeKeyConfig<T>, 'parentId'>
  /** Human-readable label for changed fields (e.g. "locale", "equip_set", "spell_slot") */
  fieldPrefix: string
  /** Function to produce a human-readable summary of an entry */
  summarize: (entry: T) => string
}

export class ArraySubTable<T extends Record<string, any>> implements SubTableManager {
  readonly tableName: string
  readonly newEntries: Ref<T[]>
  readonly originalEntries: Ref<T[] | null>
  private readonly compositeConfig: Omit<CompositeKeyConfig<T>, 'parentId'>
  private readonly childKey: keyof T & string
  private readonly fieldPrefix: string
  private readonly summarize: (entry: T) => string

  constructor(config: ArraySubTableConfig<T>) {
    this.tableName = config.tableName
    this.compositeConfig = config.compositeConfig
    this.childKey = config.compositeConfig.childKey
    this.fieldPrefix = config.fieldPrefix
    this.summarize = config.summarize
    this.newEntries = ref<T[]>([]) as Ref<T[]>
    this.originalEntries = ref<T[] | null>(null) as Ref<T[] | null>
    markRaw(this)
  }

  snapshot(): SubTableSnapshot {
    return {
      new: this.newEntries.value.map(e => ({ ...e })),
      original: this.originalEntries.value
        ? this.originalEntries.value.map(e => ({ ...e }))
        : this.newEntries.value.map(e => ({ ...e })),
    }
  }

  restore(cached: SubTableSnapshot): void {
    this.newEntries.value = (cached.new as T[]).map(e => ({ ...e }))
    this.originalEntries.value = (cached.original as T[]).map(e => ({ ...e }))
  }

  reset(): void {
    this.originalEntries.value = null
    this.newEntries.value = []
  }

  load(data: T[]): void {
    this.newEntries.value = data.map(e => ({ ...e }))
    this.commit()
  }

  revert(): void {
    if (this.originalEntries.value) {
      this.newEntries.value = this.originalEntries.value.map(e => ({ ...e }))
    } else {
      this.newEntries.value = []
    }
  }

  commit(): void {
    this.originalEntries.value = this.newEntries.value.map(e => ({ ...e }))
  }

  getOriginalEntries(): T[] | null {
    return this.originalEntries.value
  }

  setOriginalEntries(data: T[]): void {
    this.originalEntries.value = data.map(e => ({ ...e }))
  }

  getNewEntries(): T[] {
    return this.newEntries.value
  }

  setNewEntries(data: T[]): void {
    this.newEntries.value = data.map(e => ({ ...e }))
  }

  pushNewEntry(entry: T): void {
    this.newEntries.value.push(entry)
  }

  removeNewEntry(index: number): void {
    this.newEntries.value.splice(index, 1)
  }

  getSqlDiff(parentId: number): string {
    return this.getSqlDiffStatements(parentId).join('\n')
  }

  getSqlDiffStatements(parentId: number): string[] {
    if (!this.originalEntries.value) {
      return []
    }
    return this.buildStatements(this.originalEntries.value, this.newEntries.value, parentId)
  }

  getChangedFields(parentId: number): FieldChange[] {
    if (!this.originalEntries.value) {
      return []
    }
    return this.buildFieldChanges(this.originalEntries.value, this.newEntries.value, parentId)
  }

  getLive(): object {
    return this.newEntries
  }

  cloneLive(): unknown {
    return this.newEntries.value.map(e => ({ ...e }))
  }

  cloneOriginal(): unknown | null {
    return this.originalEntries.value ? this.originalEntries.value.map(e => ({ ...e })) : null
  }

  buildStatements(original: unknown | null, current: unknown | null, parentId: number): string[] {
    if (current == null) {
      return []
    }
    return generateCompositeKeyDiffStatements(
      { ...this.compositeConfig, parentId },
      (original ?? []) as T[],
      current as T[],
    )
  }

  buildFieldChanges(original: unknown | null, current: unknown | null, _parentId: number): FieldChange[] {
    if (current == null) {
      return []
    }
    const origEntries = (original ?? []) as T[]
    const curEntries = current as T[]
    const changes: FieldChange[] = []
    const keyFn = this.compositeConfig.getUniqueKey || ((entry: T) => String(entry[this.childKey]))
    const origMap = new Map(origEntries.map(o => [keyFn(o), o]))
    const curMap = new Map(curEntries.map(c => [keyFn(c), c]))
    for (const [key, orig] of origMap) {
      if (!curMap.has(key)) {
        changes.push({ field: `${this.fieldPrefix}_${key}`, oldValue: this.summarize(orig), newValue: '(deleted)' })
      }
    }
    for (const [key, cur] of curMap) {
      const orig = origMap.get(key)
      if (!orig) {
        changes.push({ field: `${this.fieldPrefix}_${key}`, oldValue: '(none)', newValue: this.summarize(cur) })
      } else if (!this.compositeConfig.isEqual(orig, cur)) {
        changes.push({ field: `${this.fieldPrefix}_${key}`, oldValue: this.summarize(orig), newValue: this.summarize(cur) })
      }
    }
    return changes
  }
}

// ─── DetachedArraySubTable: multi-row tables keyed by their own columns ─────

export interface DetachedArraySubTableConfig<T extends Record<string, any>> {
  tableName: string
  columns: string[]
  getUniqueKey: (entry: T) => string
  buildWhereClause: (entry: T) => string
  isEqual: (a: T, b: T) => boolean
  toSqlValues: (entry: T) => (string | number | null)[]
  fieldPrefix: string
  summarize: (entry: T) => string
  deleteMissing?: boolean
}

function formatDetachedSqlValue(value: string | number | null): string | number {
  return value == null ? 'NULL' : value
}

export class DetachedArraySubTable<T extends Record<string, any>> implements SubTableManager {
  readonly tableName: string
  readonly newEntries: Ref<T[]>
  readonly originalEntries: Ref<T[] | null>
  private readonly columns: string[]
  private readonly getUniqueKey: (entry: T) => string
  private readonly buildWhereClause: (entry: T) => string
  private readonly isEqual: (a: T, b: T) => boolean
  private readonly toSqlValues: (entry: T) => (string | number | null)[]
  private readonly fieldPrefix: string
  private readonly summarize: (entry: T) => string
  private readonly deleteMissing: boolean

  constructor(config: DetachedArraySubTableConfig<T>) {
    this.tableName = config.tableName
    this.columns = config.columns
    this.getUniqueKey = config.getUniqueKey
    this.buildWhereClause = config.buildWhereClause
    this.isEqual = config.isEqual
    this.toSqlValues = config.toSqlValues
    this.fieldPrefix = config.fieldPrefix
    this.summarize = config.summarize
    this.deleteMissing = config.deleteMissing ?? true
    this.newEntries = ref<T[]>([]) as Ref<T[]>
    this.originalEntries = ref<T[] | null>(null) as Ref<T[] | null>
    markRaw(this)
  }

  snapshot(): SubTableSnapshot {
    return {
      new: this.newEntries.value.map(e => ({ ...e })),
      original: this.originalEntries.value
        ? this.originalEntries.value.map(e => ({ ...e }))
        : this.newEntries.value.map(e => ({ ...e })),
    }
  }

  restore(cached: SubTableSnapshot): void {
    this.newEntries.value = (cached.new as T[]).map(e => ({ ...e }))
    this.originalEntries.value = (cached.original as T[]).map(e => ({ ...e }))
  }

  reset(): void {
    this.originalEntries.value = null
    this.newEntries.value = []
  }

  load(data: T[]): void {
    this.newEntries.value = data.map(e => ({ ...e }))
    this.commit()
  }

  revert(): void {
    if (this.originalEntries.value) {
      this.newEntries.value = this.originalEntries.value.map(e => ({ ...e }))
    } else {
      this.newEntries.value = []
    }
  }

  commit(): void {
    this.originalEntries.value = this.newEntries.value.map(e => ({ ...e }))
  }

  getOriginalEntries(): T[] | null {
    return this.originalEntries.value
  }

  setOriginalEntries(data: T[]): void {
    this.originalEntries.value = data.map(e => ({ ...e }))
  }

  getNewEntries(): T[] {
    return this.newEntries.value
  }

  setNewEntries(data: T[]): void {
    this.newEntries.value = data.map(e => ({ ...e }))
  }

  pushNewEntry(entry: T): void {
    this.newEntries.value.push(entry)
  }

  removeNewEntry(index: number): void {
    this.newEntries.value.splice(index, 1)
  }

  getDeletedEntries(): T[] {
    if (!this.deleteMissing || !this.originalEntries.value) {
      return []
    }
    const currentKeys = new Set(this.newEntries.value.map(entry => this.getUniqueKey(entry)))
    return this.originalEntries.value.filter(entry => !currentKeys.has(this.getUniqueKey(entry)))
  }

  getSqlDiff(parentId: number): string {
    return this.getSqlDiffStatements(parentId).join('\n')
  }

  getSqlDiffStatements(parentId: number): string[] {
    if (!this.originalEntries.value) {
      return []
    }
    return this.buildStatements(this.originalEntries.value, this.newEntries.value, parentId)
  }

  getChangedFields(parentId: number): FieldChange[] {
    if (!this.originalEntries.value) {
      return []
    }
    return this.buildFieldChanges(this.originalEntries.value, this.newEntries.value, parentId)
  }

  getLive(): object {
    return this.newEntries
  }

  cloneLive(): unknown {
    return this.newEntries.value.map(e => ({ ...e }))
  }

  cloneOriginal(): unknown | null {
    return this.originalEntries.value ? this.originalEntries.value.map(e => ({ ...e })) : null
  }

  buildStatements(original: unknown | null, current: unknown | null, _parentId: number): string[] {
    if (current == null) {
      return []
    }
    const origEntries = (original ?? []) as T[]
    const curEntries = current as T[]

    const lines: string[] = []
    const originalMap = new Map(origEntries.map(entry => [this.getUniqueKey(entry), entry]))
    const currentMap = new Map(curEntries.map(entry => [this.getUniqueKey(entry), entry]))

    if (this.deleteMissing) {
      for (const [key, original] of originalMap) {
        if (!currentMap.has(key)) {
          lines.push(`DELETE FROM \`${this.tableName}\` WHERE ${this.buildWhereClause(original)};`)
        }
      }
    }

    for (const [key, current] of currentMap) {
      const original = originalMap.get(key)
      if (!original || !this.isEqual(original, current)) {
        lines.push(`DELETE FROM \`${this.tableName}\` WHERE ${this.buildWhereClause(current)};`)
        const columnNames = this.columns.map(column => `\`${column}\``).join(', ')
        const values = this.toSqlValues(current).map(formatDetachedSqlValue).join(', ')
        lines.push(`INSERT INTO \`${this.tableName}\` (${columnNames}) VALUES (${values});`)
      }
    }

    return lines
  }

  buildFieldChanges(original: unknown | null, current: unknown | null, _parentId: number): FieldChange[] {
    if (current == null) {
      return []
    }
    const origEntries = (original ?? []) as T[]
    const curEntries = current as T[]

    const changes: FieldChange[] = []
    const originalMap = new Map(origEntries.map(entry => [this.getUniqueKey(entry), entry]))
    const currentMap = new Map(curEntries.map(entry => [this.getUniqueKey(entry), entry]))

    if (this.deleteMissing) {
      for (const [key, original] of originalMap) {
        if (!currentMap.has(key)) {
          changes.push({ field: `${this.fieldPrefix}_${key}`, oldValue: this.summarize(original), newValue: '(deleted)' })
        }
      }
    }

    for (const [key, current] of currentMap) {
      const original = originalMap.get(key)
      if (!original) {
        changes.push({ field: `${this.fieldPrefix}_${key}`, oldValue: '(none)', newValue: this.summarize(current) })
      } else if (!this.isEqual(original, current)) {
        changes.push({ field: `${this.fieldPrefix}_${key}`, oldValue: this.summarize(original), newValue: this.summarize(current) })
      }
    }

    return changes
  }
}
