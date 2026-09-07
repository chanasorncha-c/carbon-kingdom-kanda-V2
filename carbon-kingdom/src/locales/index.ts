import en from './en.json'
import th from './th.json'

export type LocaleKey = keyof typeof en

const locales = { en, th } as const

/**
 * Active UI language. Every user-facing string lives in locales/en.json and
 * locales/th.json (same keys, per the GDD's i18n requirement) — swapping
 * this one constant re-languages the whole game.
 */
export const ACTIVE_LOCALE: keyof typeof locales = 'th'

export const strings = locales[ACTIVE_LOCALE] as Record<LocaleKey, string>

/** Simple {placeholder} interpolation, e.g. t('level1.progress', {current: 1, total: 15}). */
export function t(key: LocaleKey, vars?: Record<string, string | number>) {
  let s = strings[key] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return s
}
