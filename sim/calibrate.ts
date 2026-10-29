// Подбор лимитов забегов под целевой темп: для каждого забега по порядку ищем такой лимит,
// чтобы осторожный бот (ждёт зелёного прогноза) стартовал к целевой минуте.
// Запуск: node --experimental-strip-types sim/calibrate.ts [кликов_в_секунду]
import { RACES } from '../src/game/config.ts'
import type { RaceId } from '../src/game/config.ts'
import { simulate } from './simulate.ts'

/** Целевая минута активной игры к старту каждого забега */
const TARGET: Record<RaceId, number> = JSON.parse(process.env.TARGET ?? 'null') ?? {
  '1k': 2, '3k': 5, '5k': 10, '10k': 18, '15k': 28, half: 45, '30k': 65, marathon: 90, '50k': 120,
}
const cps = Number(process.argv[2] ?? 4)
const races = RACES as unknown as { id: RaceId; cutoff: number }[]

for (const r of races) {
  const target = TARGET[r.id] * 60
  const startAt = (cutoff: number) => {
    r.cutoff = cutoff
    return simulate({ cps, stopAt: r.id, maxT: target * 2 }).starts[r.id] ?? Infinity
  }
  // старт тем позже, чем жёстче лимит: ищем лимит, при котором старт ≈ цели
  let lo = r.cutoff * 0.3, hi = r.cutoff * 3
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2
    if (startAt(mid) > target) lo = mid
    else hi = mid
  }
  const cutoff = Math.round(hi * 2) / 2 // к полуминуте
  const at = startAt(cutoff)
  console.log(`${r.id.padEnd(9)} лимит ${String(cutoff).padStart(6)} мин → старт на ${(at / 60).toFixed(1)} мин (цель ${TARGET[r.id]})`)
}
