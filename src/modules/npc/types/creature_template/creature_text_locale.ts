export interface CreatureTextLocale {
  CreatureID: number;
  GroupID: number;
  ID: number;
  Locale: string;
  Text?: string;
}

export interface LocaleSelectOption {
  value: string;
  name: string;
}

export const locale_options: LocaleSelectOption[] = [
  { value: 'koKR', name: 'Korean' },
  { value: 'frFR', name: 'French' },
  { value: 'deDE', name: 'German' },
  { value: 'zhCN', name: 'Chinese' },
  { value: 'zhTW', name: 'Taiwanese' },
  { value: 'esES', name: 'Spanish (EU)' },
  { value: 'esMX', name: 'Spanish (Latin American)' },
  { value: 'ruRU', name: 'Russian' },
];
