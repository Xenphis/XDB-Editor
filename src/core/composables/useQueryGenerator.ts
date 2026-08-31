import { computed, type Ref } from 'vue'
import { update, insert, delete_, rstr } from 'squel-ts'
import { toSqlLiteral } from '@core/utils/sql'

type AnyRow = Record<string, unknown>

const SQUEL_CONFIG = {
  autoQuoteFieldNames: true,
  autoQuoteTableNames: true,
  nameQuoteCharacter: '`',
  tableAliasQuoteCharacter: '`',
  fieldAliasQuoteCharacter: '`',
}

// --- Value helpers ---

// Values are rendered to SQL literals by toSqlLiteral (single escaping
// source) and handed to squel wrapped in rstr() so squel does not apply
// its own quote-doubling on top — that combination corrupted strings
// containing quotes and left backslashes unescaped.
function sqlValue(value: unknown) {
  return rstr(toSqlLiteral(value))
}

function normalizeValue(value: unknown): unknown {
  if (value === undefined || value === '') return null
  return value
}

function valuesAreEqual(a: unknown, b: unknown): boolean {
  const na = normalizeValue(a)
  const nb = normalizeValue(b)
  if (na === null && nb === null) return true
  return na === nb
}

// --- SQL generation functions ---

export interface FieldChange {
  field: string
  oldValue: unknown
  newValue: unknown
}

export function generateDiffQuery(
  table: string,
  primaryKey: string,
  originalRow: AnyRow,
  currentRow: AnyRow,
): string {
  let hasDiff = false
  const query = update(SQUEL_CONFIG).table(table)

  for (const key in originalRow) {
    if (key === primaryKey) continue
    if (!valuesAreEqual(originalRow[key], currentRow[key])) {
      hasDiff = true
      query.set(key, sqlValue(currentRow[key]))
    }
  }

  if (!hasDiff) return ''

  query.where(`\`${primaryKey}\` = ${toSqlLiteral(originalRow[primaryKey])}`)
  return query.toString() + ';'
}

export function generateFullQueryStatements(
  table: string,
  primaryKey: string,
  row: AnyRow,
): string[] {
  const delQuery = delete_(SQUEL_CONFIG)
    .from(table)
    .where(`\`${primaryKey}\` = ${toSqlLiteral(row[primaryKey])}`)
    .toString()

  const literalRow = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, sqlValue(value)]),
  )
  const insQuery = insert(SQUEL_CONFIG)
    .into(table)
    .setFieldsRows([literalRow])
    .toString()

  return [delQuery + ';', insQuery + ';']
}

export function generateFullQuery(
  table: string,
  primaryKey: string,
  row: AnyRow,
): string {
  return generateFullQueryStatements(table, primaryKey, row).join('\n')
}

export function generateDeleteQuery(
  table: string,
  primaryKey: string,
  id: string | number,
): string {
  return delete_(SQUEL_CONFIG)
    .from(table)
    .where(`\`${primaryKey}\` = ${toSqlLiteral(id)}`)
    .toString() + ';'
}

/**
 * Insert-or-update a full row: inserts it when missing, otherwise only
 * overwrites the changed columns. Used for single-row sub-tables whose row
 * may not exist yet (a plain UPDATE would silently no-op).
 */
export function generateUpsertQuery(
  table: string,
  row: AnyRow,
  changedColumns: string[],
): string {
  const keys = Object.keys(row)
  const cols = keys.map(k => `\`${k}\``).join(', ')
  const vals = keys.map(k => toSqlLiteral(row[k])).join(', ')
  const updates = changedColumns.map(k => `\`${k}\` = VALUES(\`${k}\`)`).join(', ')
  return `INSERT INTO \`${table}\` (${cols}) VALUES (${vals}) ON DUPLICATE KEY UPDATE ${updates};`
}

export function getChangedFields(
  originalRow: AnyRow,
  currentRow: AnyRow,
  primaryKey: string,
): FieldChange[] {
  const changes: FieldChange[] = []
  for (const key in originalRow) {
    if (key === primaryKey) continue
    if (!valuesAreEqual(originalRow[key], currentRow[key])) {
      changes.push({
        field: key,
        oldValue: originalRow[key],
        newValue: currentRow[key],
      })
    }
  }
  return changes
}

// --- Composite key SQL generation (multi-row tables) ---

export interface CompositeKeyConfig<T> {
  table: string
  parentKey: string
  parentId: number
  childKey: keyof T & string
  columns: string[]
  isEqual: (a: T, b: T) => boolean
  toSqlValues: (entry: T) => (string | number | null)[]
  skipInsert?: (entry: T) => boolean
  /**
   * Optional function to generate a unique key for composite keys.
   * If not provided, childKey will be used as the unique identifier.
   * Use this for tables with multi-column composite keys (e.g., creature_text: GroupID + ID)
   */
  getUniqueKey?: (entry: T) => string
  /**
   * Optional function to build the WHERE clause for DELETE/UPDATE operations.
   * Used for multi-column composite keys.
   * If not provided, uses default: `parentKey = parentId AND childKey = entry[childKey]`
   */
  buildWhereClause?: (entry: T, parentId: number) => string
}

export function generateCompositeKeyDiffStatements<T>(
  config: CompositeKeyConfig<T>,
  original: T[],
  current: T[],
): string[] {
  const { table, parentKey, parentId, childKey, columns, isEqual, toSqlValues, skipInsert, getUniqueKey, buildWhereClause } = config
  const lines: string[] = []
  const keyFn = getUniqueKey || ((entry: T) => String(entry[childKey]))
  const originalMap = new Map(original.map(o => [keyFn(o), o]))
  const currentMap = new Map(current.map(c => [keyFn(c), c]))

  // Build WHERE clause for deletion
  const getWhereClause = (entry: T): string => {
    if (buildWhereClause) {
      return buildWhereClause(entry, parentId)
    }
    // Default: single childKey
    return `\`${parentKey}\` = ${parentId} AND \`${childKey}\` = ${toSqlLiteral(entry[childKey])}`
  }

  // Deleted entries
  for (const [uniqueKey, origEntry] of originalMap) {
    if (!currentMap.has(uniqueKey)) {
      lines.push(`DELETE FROM \`${table}\` WHERE ${getWhereClause(origEntry)};`)
    }
  }

  // Added or modified entries
  for (const [uniqueKey, cur] of currentMap) {
    const orig = originalMap.get(uniqueKey)
    if (!orig || !isEqual(orig, cur)) {
      lines.push(`DELETE FROM \`${table}\` WHERE ${getWhereClause(cur)};`)
      if (!skipInsert || !skipInsert(cur)) {
        const colNames = [`\`${parentKey}\``, `\`${childKey}\``, ...columns.map(c => `\`${c}\``)].join(', ')
        // `toSqlValues` returns null for a NULL column (the idiom every config
        // uses for optional text). Joining that directly would render it as an
        // empty string — `VALUES (1, 2, )`, which the server rejects — so map
        // it to the keyword here. Non-null values are passed through untouched:
        // configs pre-quote their strings themselves.
        const vals = [parentId, toSqlLiteral(cur[childKey]), ...toSqlValues(cur)]
          .map(v => (v == null ? 'NULL' : v))
          .join(', ')
        lines.push(`INSERT INTO \`${table}\` (${colNames}) VALUES (${vals});`)
      }
    }
  }

  return lines
}

export function generateCompositeKeyDiffSql<T>(
  config: CompositeKeyConfig<T>,
  original: T[],
  current: T[],
): string {
  return generateCompositeKeyDiffStatements(config, original, current).join('\n')
}

// --- Vue composable ---

export function useQueryGenerator<T extends object>(
  table: string,
  primaryKey: string,
  originalValue: Ref<T | null>,
  currentForm: T,
) {
  const changedFields = computed<FieldChange[]>(() => {
    if (!originalValue.value) return []
    return getChangedFields(
      originalValue.value as unknown as AnyRow,
      currentForm as unknown as AnyRow,
      primaryKey,
    )
  })

  const hasChanges = computed(() => changedFields.value.length > 0)

  const diffQuery = computed(() => {
    if (!originalValue.value) return ''
    return generateDiffQuery(
      table,
      primaryKey,
      originalValue.value as unknown as AnyRow,
      currentForm as unknown as AnyRow,
    )
  })

  const fullQuery = computed(() => {
    if (!originalValue.value) return ''
    return generateFullQuery(
      table,
      primaryKey,
      currentForm as unknown as AnyRow,
    )
  })

  return {
    diffQuery,
    fullQuery,
    hasChanges,
    changedFields,
  }
}
