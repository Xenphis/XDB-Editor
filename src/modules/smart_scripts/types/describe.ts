import type { SmartScript } from './smart_scripts'
import {
  getSaiActionDef,
  getSaiEventDef,
  getSaiTargetDef,
  SAI_EVENT_LINK,
  type SaiParamDef,
  type SaiTypeDef,
} from './sai'

// Pure helpers turning a smart_scripts row into human-readable text: the
// per-segment summaries shown on event cards and the auto-generated `comment`
// column (TrinityCore convention: "Npc Name - On Event - Action").

function paramValue(row: SmartScript, key: SaiParamDef['key']): number {
  return row[key]
}

function formatMs(value: number): string {
  return value % 1000 === 0 ? `${value / 1000}s` : `${value}ms`
}

function formatParam(def: SaiParamDef, value: number): string | undefined {
  if (value === 0 && def.kind !== 'enum') return undefined
  switch (def.kind) {
    case 'bool':
      return value ? def.label : undefined
    case 'percent':
      return `${def.label} ${value}%`
    case 'ms':
      return `${def.label} ${formatMs(value)}`
    case 'seconds':
      return `${def.label} ${value}s`
    case 'enum': {
      const option = def.options?.find(o => o.value === value)
      // Skip enum defaults (value 0) without a meaningful name to keep phrases short.
      if (value === 0 && !option) return undefined
      return option ? option.name : `${def.label} ${value}`
    }
    case 'flags':
      return `${def.label} 0x${value.toString(16).toUpperCase()}`
    default:
      return `${def.label} ${value}`
  }
}

// Merges "Foo min 2s, Foo max 4s" pairs into "Foo 2s–4s" and drops zero-valued
// params, then caps the summary length.
function summarizeParams(def: SaiTypeDef, row: SmartScript): string {
  const parts: string[] = []
  const params = def.params
  for (let i = 0; i < params.length; i++) {
    const param = params[i]
    if (!param) continue
    const next = params[i + 1]
    if (
      next
      && param.label.endsWith(' min') && next.label.endsWith(' max')
      && param.label.slice(0, -4) === next.label.slice(0, -4)
      && param.kind === next.kind
    ) {
      const min = paramValue(row, param.key)
      const max = paramValue(row, next.key)
      if (min !== 0 || max !== 0) {
        const format = (v: number) =>
          param.kind === 'ms' ? formatMs(v) : param.kind === 'percent' ? `${v}%` : `${v}`
        parts.push(`${param.label.slice(0, -4)} ${format(min)}–${format(max)}`)
      }
      i++
      continue
    }
    const formatted = formatParam(param, paramValue(row, param.key))
    if (formatted !== undefined) parts.push(formatted)
  }
  if (parts.length > 3) return `${parts.slice(0, 3).join(', ')}, …`
  return parts.join(', ')
}

function genericParamSummary(row: SmartScript, keys: SaiParamDef['key'][]): string {
  return keys
    .map((key, index) => ({ value: paramValue(row, key), index }))
    .filter(p => p.value !== 0)
    .map(p => `p${p.index + 1}=${p.value}`)
    .join(', ')
}

function describe(
  def: SaiTypeDef | undefined,
  typeId: number,
  row: SmartScript,
  genericKeys: SaiParamDef['key'][],
): string {
  if (!def) return `Unknown type ${typeId}`
  const summary = def.curated ? summarizeParams(def, row) : genericParamSummary(row, genericKeys)
  return summary ? `${def.name} (${summary})` : def.name
}

const EVENT_KEYS: SaiParamDef['key'][] = ['event_param1', 'event_param2', 'event_param3', 'event_param4']
const ACTION_KEYS: SaiParamDef['key'][] = ['action_param1', 'action_param2', 'action_param3', 'action_param4', 'action_param5', 'action_param6']
const TARGET_KEYS: SaiParamDef['key'][] = ['target_param1', 'target_param2', 'target_param3']

export function describeEvent(row: SmartScript): string {
  return describe(getSaiEventDef(row.event_type), row.event_type, row, EVENT_KEYS)
}

export function describeAction(row: SmartScript): string {
  return describe(getSaiActionDef(row.action_type), row.action_type, row, ACTION_KEYS)
}

export function describeTarget(row: SmartScript): string {
  return describe(getSaiTargetDef(row.target_type), row.target_type, row, TARGET_KEYS)
}

function titleCase(name: string): string {
  return name
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// TrinityCore comment convention: "Npc Name - On Event - Action".
export function generateComment(row: SmartScript, ownerName: string): string {
  const event = getSaiEventDef(row.event_type)
  const action = getSaiActionDef(row.action_type)
  const eventPart = row.event_type === SAI_EVENT_LINK
    ? 'On Link'
    : `On ${event ? titleCase(event.name) : `Event ${row.event_type}`}`
  let actionPart = action ? titleCase(action.name) : `Action ${row.action_type}`
  if (action?.name === 'TALK' || action?.name === 'SIMPLE_TALK') {
    actionPart = `Say Line ${row.action_param1}`
  } else if (action?.name === 'CAST' || action?.name === 'SELF_CAST' || action?.name === 'INVOKER_CAST') {
    actionPart = `Cast Spell ${row.action_param1}`
  } else if (action?.name === 'SET_EVENT_PHASE') {
    actionPart = `Set Event Phase ${row.action_param1}`
  } else if (action?.name === 'CALL_TIMED_ACTIONLIST') {
    actionPart = `Run Timed Actionlist ${row.action_param1}`
  }
  return `${ownerName} - ${eventPart} - ${actionPart}`
}
