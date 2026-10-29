// Форматирование для интерфейса (числа и время из game/logic — fmt, fmtClock).
import { fmtClock } from '../game/logic.ts'
import { numLocale, t } from '../i18n.ts'

export const pct = (x: number) => Math.round(x * 100) + '%'
/** Множитель «×1,25» в локали языка */
export const xMult = (m: number) => '×' + (Math.round(m * 100) / 100).toLocaleString(numLocale())
/** Часы с минутами: 4.5 → «4 ч 30 мин» */
export function fmtHours(h: number): string {
  const m = Math.round((h % 1) * 60)
  return t('{h} ч', { h: Math.floor(h) }) + (m ? ' ' + t('{m} мин', { m }) : '')
}
/** Длительность отсутствия: «6 ч 24 мин» / «6 h 24 min» */
export const fmtAway = (sec: number) =>
  sec < 3600
    ? t('{m} мин', { m: Math.floor(sec / 60) })
    : t('{h} ч', { h: Math.floor(sec / 3600) }) + ' ' + t('{m} мин', { m: Math.floor((sec % 3600) / 60) })
/** Темп «6:12 /км» */
export const paceText = (kmh: number) => fmtClock(60 / kmh) + ' ' + t('/км')
/** Где сошёл: сотые вниз и никогда не равно дистанции (иначе «сход на 1.0 из 1 км») */
export const dnfKm = (covered: number, km: number) => Math.min(Math.floor(covered * 100) / 100, km - 0.01).toFixed(2)
