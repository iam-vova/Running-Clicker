// Локализация. Язык по умолчанию и запасной — английский.
// Языки подключаются сами: каждый файл locales/<code>.ts — один язык (см. locales/en.ts).
// t('race.title', { name }) → «Race: 5 km»; множественное число — t('profile.medalsFor', { count: n }).
import { ref, watchEffect } from 'vue'
import type { Locale, Message, MessageKey } from './define.ts'
import en from './locales/en.ts'

export type { MessageKey } from './define.ts'

const modules = import.meta.glob<{ default: Locale }>('./locales/*.ts', { eager: true })
const DEFAULT = 'en'

/** Все языки игры: английский первым, остальные по названию */
export const LOCALES: Locale[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => (a.code === DEFAULT ? -1 : b.code === DEFAULT ? 1 : a.name.localeCompare(b.name)))
const byCode = new Map(LOCALES.map((l) => [l.code.toLowerCase(), l]))

/** Ближайший поддерживаемый язык: pt-BR → pt-BR или pt; иначе null */
function match(code: string | null | undefined): string | null {
  if (!code) return null
  const c = code.toLowerCase()
  return byCode.get(c)?.code ?? byCode.get(c.split('-')[0])?.code ?? null
}

const KEY = 'ultramarathon-lang'
/** Сохранённый выбор → язык браузера → английский */
function initial(): string {
  try {
    const saved = match(localStorage.getItem(KEY))
    if (saved) return saved
  } catch {
    /* хранилище недоступно */
  }
  for (const l of navigator.languages ?? [navigator.language]) {
    const m = match(l)
    if (m) return m
  }
  return DEFAULT
}

export const lang = ref(initial())

export function setLang(code: string) {
  lang.value = match(code) ?? DEFAULT
  try {
    localStorage.setItem(KEY, lang.value)
  } catch {
    /* не запомним — не страшно */
  }
}

watchEffect(() => {
  document.documentElement.lang = lang.value
})

const plurals = new Map<string, Intl.PluralRules>()
function pluralForm(m: Exclude<Message, string>, count: number): string {
  let rules = plurals.get(lang.value)
  if (!rules) plurals.set(lang.value, (rules = new Intl.PluralRules(lang.value)))
  return m[rules.select(count)] ?? m.other
}

/** Перевод по ключу; нет перевода в языке — английский; {param} подставляются, {count} выбирает форму числа */
export function t(key: MessageKey, p: Record<string, string | number> = {}): string {
  const m: Message = byCode.get(lang.value.toLowerCase())?.messages[key] ?? en.messages[key] ?? key
  const s = typeof m === 'string' ? m : pluralForm(m, Number(p.count ?? 0))
  return s.replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? ''))
}

/** Локаль для Intl (разделитель дробей и т. п.) */
export const locale = () => lang.value
