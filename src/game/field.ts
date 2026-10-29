// Соперники на забеге: поле любителей с ровным темпом. Время каждого — доля лимита дистанции:
// лидеры — около половины лимита, середина — ~0.7, хвост (≈7%) не укладывается в лимит и сходит.
import { RACES } from './config.ts'
import type { RaceId } from './config.ts'

/** Сколько человек на старте */
export const FIELD: Record<RaceId, number> = {
  '1k': 40, '3k': 60, '5k': 120, '10k': 200, '15k': 150, half: 300, '30k': 180, marathon: 500, '50k': 150,
}

/** Детерминированный ГСЧ: одна и та же попытка — те же соперники (после перезагрузки тоже) */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let cache: { key: string; times: number[] } | null = null
/** Время финиша каждого соперника, минуты, по возрастанию */
export function fieldTimes(id: RaceId, seed: number): number[] {
  const key = `${id}:${seed}`
  if (cache?.key === key) return cache.times
  const cutoff = RACES.find((r) => r.id === id)!.cutoff
  const rnd = mulberry32(seed)
  const times = Array.from({ length: FIELD[id] - 1 }, () => cutoff * (0.48 + 0.57 * rnd() ** 1.3)).sort((a, b) => a - b)
  cache = { key, times }
  return times
}

/** Место на трассе сейчас: 1 + сколько соперников впереди */
export function livePlace(id: RaceId, seed: number, elapsed: number, covered: number): number {
  const km = RACES.find((r) => r.id === id)!.km
  // соперник впереди, если его ровный темп увёл дальше: km·elapsed/T > covered ⇔ T < km·elapsed/covered
  if (covered <= 0) return FIELD[id]
  const limit = (km * elapsed) / covered
  return 1 + countBelow(fieldTimes(id, seed), limit)
}

/** Место на финише: 1 + сколько соперников финишировали раньше */
export const finishPlace = (id: RaceId, seed: number, time: number) => 1 + countBelow(fieldTimes(id, seed), time)

function countBelow(sorted: number[], x: number) {
  let lo = 0
  let hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sorted[mid] < x) lo = mid + 1
    else hi = mid
  }
  return lo
}
