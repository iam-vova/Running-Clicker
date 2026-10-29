// Типы локалей. Источник ключей — английский словарь (locales/en.ts).
import type { messages as en } from './locales/en.ts'

/** Множественное число по правилам языка (Intl.PluralRules): медаль / медали / медалей */
export type Plural = { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string }
export type Message = string | Plural

export type MessageKey = keyof typeof en
/** Полный словарь языка: все ключи английского, строки — строками, множественные — объектом */
export type Messages = { [K in MessageKey]: (typeof en)[K] extends string ? string : Plural }

export type Locale = {
  code: string // BCP-47: 'en', 'ru', 'es', 'pt-BR'…
  name: string // название на самом языке — так оно показано в настройках
  messages: Messages
}

export const defineLocale = <M extends Record<string, Message>>(l: { code: string; name: string; messages: M }) => l
