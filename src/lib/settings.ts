export interface Settings { dark: boolean; sound: boolean; interval: number }
export const SETTINGS_KEY = 'focus.settings.v1'
export const validSettings = (v: unknown): v is Settings => !!v && typeof v === 'object' && typeof (v as Settings).dark === 'boolean' && typeof (v as Settings).sound === 'boolean' && Number.isInteger((v as Settings).interval) && (v as Settings).interval >= 5 && (v as Settings).interval <= 3600
export const defaultSettings = (): Settings => ({ dark: matchMedia('(prefers-color-scheme: dark)').matches, sound: true, interval: 60 })
