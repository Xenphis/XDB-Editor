export interface BitmaskOption {
  value: number
  hex: string
  name: string
  comment?: string
}

export interface SelectOption {
  value: number | string
  name: string
  comment?: string
}

export const locale_options: SelectOption[] = [
  { value: 'koKR', name: 'koKR', comment: 'Korean (Korea)' },
  { value: 'frFR', name: 'frFR', comment: 'French (France)' },
  { value: 'deDE', name: 'deDE', comment: 'German (Germany)' },
  { value: 'zhCN', name: 'zhCN', comment: 'Chinese (China)' },
  { value: 'zhTW', name: 'zhTW', comment: 'Chinese (Taiwan)' },
  { value: 'esES', name: 'esES', comment: 'Spanish (Spain)' },
  { value: 'esMX', name: 'esMX', comment: 'Spanish (Mexico)' },
  { value: 'ruRU', name: 'ruRU', comment: 'Russian (Russia)' },
];