// ─── SQL string escaping ────────────────────────────────────────────

/**
 * Escape a string for safe inclusion in a SQL literal (single-quoted context).
 * Handles backslashes and single quotes (MySQL style).
 */
export function escapeSQL(val: string): string {
  return val.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

/**
 * Render a text column value as a SQL literal. Empty strings are treated
 * as NULL (matches how the editors reset optional text columns).
 */
export function sqlText(value: string | null | undefined): string {
  return value != null && value !== '' ? `'${escapeSQL(value)}'` : 'NULL'
}

/**
 * Render a numeric column value as a SQL literal.
 */
export function sqlNumber(value: number | null | undefined): string | number {
  return value == null || !Number.isFinite(value) ? 'NULL' : value
}

/**
 * Render any scalar value as a SQL literal. Single escaping source for
 * generated queries: strings go through escapeSQL, numbers/booleans are
 * emitted raw, null/undefined become NULL.
 */
export function toSqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL'
  if (typeof value === 'boolean') return value ? '1' : '0'
  return `'${escapeSQL(String(value))}'`
}

// ─── SQL syntax highlighting (HTML) ────────────────────────────────

/**
 * Returns an HTML string with SQL keywords, strings, fields and numbers
 * wrapped in <span> elements for styling.
 */
export function highlightSql(sql: string): string {
  if (!sql) return ''
  let result = sql
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  result = result.replace(/\b(UPDATE|INSERT INTO|DELETE FROM|SET|WHERE|VALUES|AND|OR|IN|FROM|INTO|NULL)\b/gi, '<span class="sql-keyword">$1</span>')
  result = result.replace(/('(?:[^'\\]|\\.)*')/g, '<span class="sql-string">$1</span>')
  result = result.replace(/(`[^`]+`)/g, '<span class="sql-field">$1</span>')
  result = result.replace(/(?<!<[^>]*)(\b\d+(?:\.\d+)?\b)(?![^<]*>)/g, '<span class="sql-number">$1</span>')

  return result
}

// ─── Display helpers ────────────────────────────────────────────────

/**
 * Format a value for display in a changed-fields table.
 */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'string') return `'${value}'`
  return String(value)
}
