// Симуляция баланса: жадный бот покупает то, что быстрее всего окупается.
// Запуск: npm run sim [кликов_в_секунду]
import { BOOSTS, GENERATORS, RACES, UPGRADES } from '../src/game/config.ts'
import type { BoostId, GenId, RaceId, UpgradeId } from '../src/game/config.ts'
import {
  buyBoost, buyGen, buyUpgrade, canStartRace, click, clickValue, fmt, fmtTime, genCost, genUnlocked,
  forecast, bestForecast, race, income, raceLive, tapEnergy, tapKm, catchRaceGel, feedDue, kmPerSec, newState, nextBoost, raceReady, runSpeed, startRace, statMult, tick, upgradeVisible,
} from '../src/game/logic.ts'
import type { GameState } from '../src/game/logic.ts'

const CPS = Number(process.argv[2] ?? 4)
const DT = 0.1
const MAX_T = Number(process.env.MAX_T ?? 3 * 3600)

type Option =
  | { kind: 'gen'; id: GenId; cost: number }
  | { kind: 'up'; id: UpgradeId; cost: number }
  | { kind: 'boost'; id: BoostId; cost: number }

const raceKmLeft = (s: GameState) => { const a = s.activeRace!; return RACES.find((r) => r.id === a.id)!.km - a.covered }
const pendingRace = (s: GameState) => RACES.find((r) => !s.races.includes(r.id))

/**
 * Ценность состояния для бота: доход + клики. Пока впереди забег, выносливость
 * приближает его так же, как доход, поэтому бот считает её множителем.
 */
function value(s: GameState): number {
  const base = kmPerSec(s) + clickValue(s) * CPS
  return pendingRace(s) ? base * statMult(s, 'stamina') : base
}

function options(s: GameState): Option[] {
  const res: Option[] = []
  for (const g of GENERATORS) if (genUnlocked(s, g.id)) res.push({ kind: 'gen', id: g.id, cost: genCost(g.id, s.owned[g.id]) })
  for (const u of UPGRADES) if (upgradeVisible(s, u.id)) res.push({ kind: 'up', id: u.id, cost: u.cost })
  for (const b of BOOSTS) {
    const next = nextBoost(s, b.id)
    if (next) res.push({ kind: 'boost', id: b.id, cost: next.cost })
  }
  return res
}

function buy(s: GameState, o: Option): boolean {
  if (o.kind === 'gen') return buyGen(s, o.id)
  if (o.kind === 'up') return buyUpgrade(s, o.id)
  return buyBoost(s, o.id)
}

function gainOf(s: GameState, o: Option): number {
  const copy: GameState = structuredClone(s)
  copy.km = Infinity
  buy(copy, o)
  return value(copy) - value(s)
}

const s = newState()
const log: [number, string][] = []
const mark = (t: number, what: string) => log.push([t, what])
let t = 0
let clickAcc = 0

while (t < MAX_T && pendingRace(s)) {
  clickAcc += CPS * DT
  while (clickAcc >= 1) {
    // на трассе бот тратит на рывки только силы сверх нужных до финиша
    const l = raceLive(s)
    if (!l || l.energy - tapEnergy(s, s.activeRace!.id) >= l.need - tapKm(s, s.activeRace!.id) * (l.need / Math.max(1e-9, raceKmLeft(s)))) click(s)
    clickAcc--
  }
  if (feedDue(s) && process.env.GELS !== '0') catchRaceGel(s)

  const rate = value(s)
  const best = options(s)
    .map((o) => ({ o, score: Math.max(0, o.cost - s.km) / rate + o.cost / Math.max(gainOf(s, o), 1e-9) }))
    .sort((a, b) => a.score - b.score)[0]
  if (best && s.km >= best.o.cost && buy(s, best.o)) {
    const name = best.o.kind === 'boost' ? `${best.o.id} ур. ${s.boosts[best.o.id]}` : best.o.id
    if (best.o.kind !== 'gen' || s.owned[best.o.id] === 1) mark(t, `покупка: ${name}`)
  }

  // бот стартует, когда прогноз укладывается в лимит (рывки на трассе — запас)
  // RUSH=1 — нетерпеливый игрок: стартует, как только лучший прогноз (рывки + гели) в лимите
  const go = (id: RaceId) => (process.env.RUSH ? bestForecast(s, id) <= race(id).cutoff : raceReady(s, id))
  for (const r of RACES.filter((x) => x === pendingRace(s))) if (canStartRace(s, r.id) && go(r.id)) { startRace(s, r.id); mark(t, `старт забега ${r.name}, прогноз ${forecast(s, r.km).toFixed(1)} мин (трусца ${s.owned.jog}, клуб ${s.owned.club})`) }
  if (process.env.TRACE && Math.round(t * 10) % 300 === 0) console.log('TRACE', fmtTime(t), runSpeed(s).toFixed(1), statMult(s, 'stamina').toFixed(2), RACES.map((r) => `${r.id}:${forecast(s, r.km).toFixed(1)}`).join(' '))
  const done = tick(s, DT)
  if (done) mark(t, `${done.ok ? 'финиш' : 'СХОД'} забега ${done.id} за ${done.time.toFixed(1)} мин`)
  t += DT
}

console.log(`Кликов в секунду: ${CPS}\n`)
for (const [time, what] of log) console.log(`${fmtTime(time).padStart(12)}  ${what}`)
console.log(`\nИтог через ${fmtTime(t)}: объём ${fmt(income(s))} км/ч, скорость бегуна ${runSpeed(s).toFixed(1)} км/ч, прогноз 10 км ${forecast(s, 10).toFixed(1)} мин, рывок ${fmt(clickValue(s))} км`)
console.log('Генераторы', s.owned, 'Бустеры', s.boosts)
