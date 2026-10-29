// Первый забег 1 км: можно ли пробежать его вообще без покупок, тапая с разной частотой
import { RUNNER } from '../src/game/config.ts'
import { newState, startRace, tick, raceTap, forecast, bestForecast, runSpeed, buyBoost, buyGen, feedDue, catchRaceGel } from '../src/game/logic.ts'
const base = Number(process.argv[2] ?? RUNNER.baseSpeed)
;(RUNNER as any).baseSpeed = base
function run(cps: number, prep: (s: any) => void) {
  const s = newState(); prep(s)
  startRace(s, '1k')
  let t = 0, acc = 0
  for (;;) { t += 0.05; acc += cps * 0.05; while (acc >= 1) { raceTap(s); acc-- } if (feedDue(s)) catchRaceGel(s); const r = tick(s, 0.05); if (r) return `${r.ok ? 'финиш' : 'сход'} ${(r as any).time?.toFixed?.(1) ?? ''}` }
}
const fresh = (s: any) => {}
const jogs = (n: number) => (s: any) => { s.km = 1e6; buyGen(s, 'jog', n); s.km = 0 }
for (const [n, p] of [['без покупок', fresh], ['трусца×1', jogs(1)], ['трусца×2', jogs(2)], ['трусца×3', jogs(3)], ['трусца×5', jogs(5)]] as const) {
  const s = newState(); p(s)
  console.log(`base ${base} | ${n}: скорость ${runSpeed(s).toFixed(2)}, прогноз ${forecast(s, 1).toFixed(2)}, лучший ${bestForecast(s, '1k').toFixed(2)} | ` + [0, 3, 6, 10].map((c) => `${c}/с: ${run(c, p)}`).join(' · '))
}
