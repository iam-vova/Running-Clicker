// Чистая логика без Vue: её используют и игра, и симуляция баланса.
import { finishPlace } from './field.ts'
import { BOOSTS, CLICK_INCOME_PCT, CLICK_KM, GENERATORS, LAB_STAMINA_PER_LEVEL, OFFLINE, RACES, RUNNER, TIME_SCALE, TRAIL_ULTRA_PER_LEVEL, UPGRADES } from './config.ts'
import type { BoostId, CharId, GenId, RaceId, Stat, UpgradeId } from './config.ts'

export const SAVE_VERSION = 10

export interface GameState {
  version: number
  /** выбранный персонаж; null — ещё не выбран (показываем экран выбора) */
  character: CharId | null
  km: number
  totalKm: number
  clicks: number
  owned: Record<GenId, number>
  upgrades: UpgradeId[]
  /** уровень каждой ветки бустеров, 0 = стартовый */
  boosts: Record<BoostId, number>
  races: RaceId[]
  /** медали — вторая валюта (ТЗ v0.4, §4.4): только за финиш забега */
  medals: number
  /** лучшее время финиша по дистанциям, минуты на трассе */
  bestTimes: Partial<Record<RaceId, number>>
  /**
   * elapsed — секунды реального времени (= минуты на трассе), covered — пройдено км,
   * energy — запас сил 0…1, fed — сколько пунктов питания уже пройдено
   */
  activeRace: ActiveRace | null
  lastSave: number
}

/** pace — темп, с которым вышел на старт (км за минуту трассы): форма на забеге не меняется от покупок по ходу */
/** seed — состав соперников этой попытки (game/field.ts) */
export type ActiveRace = { id: RaceId; elapsed: number; covered: number; energy: number; fed: number; pace?: number; seed?: number }

export function newState(): GameState {
  return {
    version: SAVE_VERSION,
    character: null,
    km: 0,
    totalKm: 0,
    clicks: 0,
    owned: Object.fromEntries(GENERATORS.map((g) => [g.id, 0])) as Record<GenId, number>, // новые тренировки — сами
    upgrades: [],
    boosts: Object.fromEntries(BOOSTS.map((b) => [b.id, 0])) as Record<BoostId, number>,
    races: [],
    medals: 0,
    bestTimes: {},
    activeRace: null,
    lastSave: Date.now(),
  }
}

const gen = (id: GenId) => GENERATORS.find((g) => g.id === id)!
export const race = (id: RaceId) => RACES.find((r) => r.id === id)!
const upgrade = (id: UpgradeId) => UPGRADES.find((u) => u.id === id)!
const boost = (id: BoostId) => BOOSTS.find((b) => b.id === id)!

/** Текущий множитель ветки бустеров. */
export const boostMult = (s: GameState, id: BoostId) => {
  const lvl = s.boosts[id]
  return lvl ? boost(id).levels[lvl - 1].mult : 1
}

export const nextBoost = (s: GameState, id: BoostId) => boost(id).levels[s.boosts[id]] ?? null

/** Ветка бустеров открыта (ультра-снаряжение — после марафона) */
export const boostUnlocked = (s: GameState, id: BoostId) => {
  const r = (boost(id) as { unlockRace?: RaceId }).unlockRace
  return !r || s.races.includes(r)
}

export const statMult = (s: GameState, stat: Stat) =>
  BOOSTS.filter((b) => b.stat === stat).reduce((m, b) => m * boostMult(s, b.id), 1) *
  (stat === 'stamina' ? labStamina(s) : stat === 'ultra' ? trailUltra(s) : 1)
/** Выносливость от «Спортивной лаборатории» */
export const labStamina = (s: GameState) => 1 + LAB_STAMINA_PER_LEVEL * (s.owned.lab ?? 0)
/** «Ультра» от «Трейловых тренировок» */
export const trailUltra = (s: GameState) => 1 + TRAIL_ULTRA_PER_LEVEL * (s.owned.trail ?? 0)

export const genCost = (id: GenId, owned: number) => gen(id).base * gen(id).growth ** owned

/** Цена n уровней подряд: сумма геометрической прогрессии. */
export const genCostN = (id: GenId, owned: number, n: number) => {
  const g = gen(id).growth
  return (genCost(id, owned) * (g ** n - 1)) / (g - 1)
}

export const genUnlocked = (s: GameState, id: GenId) => {
  const r = gen(id).unlockRace
  return r === null || s.races.includes(r)
}

export const globalMult = (s: GameState) => s.races.reduce((m, id) => m * race(id).mult, 1)

/** Сколько км/ч объёма даёт один уровень тренировки со всеми множителями. */
export function genLevelRate(s: GameState, id: GenId): number {
  let mult = 2 ** Math.floor(s.owned[id] / 25) // каждые 25 уровней ×2
  for (const u of UPGRADES) if ('gen' in u && u.gen === id && s.upgrades.includes(u.id)) mult *= 2
  return gen(id).rate * mult * globalMult(s) * statMult(s, 'speed')
}

export const genRate = (s: GameState, id: GenId) => genLevelRate(s, id) * s.owned[id]

/** Темп, км/ч. */
export const income = (s: GameState) => GENERATORS.reduce((sum, g) => sum + genRate(s, g.id), 0)

/** Сколько км набегается за реальную секунду. */
export const kmPerSec = (s: GameState) => income(s) / TIME_SCALE

/** Доля секундного дохода, которую рывок добавляет сверху. */
export const clickPct = (s: GameState) => {
  const lvl = s.boosts.technique
  const l = lvl ? boost('technique').levels[lvl - 1] : null
  return l && 'pct' in l ? l.pct : 0
}

export const clickValue = (s: GameState) => CLICK_KM * statMult(s, 'click') + kmPerSec(s) * (CLICK_INCOME_PCT + clickPct(s))

export function upgradeVisible(s: GameState, id: UpgradeId): boolean {
  if (s.upgrades.includes(id)) return false
  const u = upgrade(id)
  return s.owned[u.gen] >= u.need
}

// --- модель бегуна ---

/** Скорость бегуна на 1 км, км/ч. Растёт от объёма тренировок. */
export function runSpeed(s: GameState): number {
  const x = Math.log10(1 + income(s) / gen('jog').rate) // порядков дохода сверх одной «Утренней трусцы»: растёт с первой же
  return RUNNER.baseSpeed + ((RUNNER.maxSpeed - RUNNER.baseSpeed) * x) / (x + RUNNER.speedHalf)
}

/** Показатель усталости Ригеля. Ниже — меньше замедление на длинной дистанции. */
export const fatigueExp = (s: GameState) =>
  1 + (RUNNER.fatigueBase - 1) / statMult(s, 'ultra') + RUNNER.fatigueExtra / statMult(s, 'stamina')

/** Прогноз финиша на дистанции, минуты. */
/** Ночной участок забега (доли дистанции), если есть */
const nightOf = (km: number) => (RACES.find((r) => r.km === km) as { night?: readonly [number, number] } | undefined)?.night
/** Темп ночью — доля дневного: растёт с уровнями ультра-снаряжения */
export const nightPace = (s: GameState) => RUNNER.nightPace[s.boosts.ultra ?? 0] ?? 1
/** Доля ночи в забеге на km (0 — без ночи) */
export const nightShare = (km: number) => {
  const n = nightOf(km)
  return n ? n[1] - n[0] : 0
}
/** Прогноз финиша, минуты: Ригель, а ночной участок бежится медленнее (nightPace) */
export const forecast = (s: GameState, km: number) =>
  ((60 * km ** fatigueExp(s)) / runSpeed(s)) * (1 - nightShare(km) + nightShare(km) / nightPace(s)) * courseOf(km)
/** Профиль трассы: во сколько раз медленнее ровной дороги (только 100 км и 100 миль) */
const courseOf = (km: number) => (RACES.find((r) => r.km === km) as { course?: number } | undefined)?.course ?? 1

/** Укладывается ли прогноз в контрольное время. Стартовать можно и без этого. */
export const raceReady = (s: GameState, id: RaceId) => forecast(s, race(id).km) <= race(id).cutoff

/** Все дистанции пройдены (после финиша 100 миль) — открыт повтор любой на личный рекорд */
export const allRacesDone = (s: GameState) => RACES.every((r) => s.races.includes(r.id))
/** Новый забег — если не пройден; после финала — любой, повтором без наград */
export const canStartRace = (s: GameState, id: RaceId) => !s.activeRace && (!s.races.includes(id) || allRacesDone(s))

/**
 * Чего не хватает до лимита. paceGap — на сколько секунд/км нужно бежать быстрее.
 * speedPct — на сколько процентов поднять скорость бегуна при нынешней выносливости.
 * stamina — какая выносливость закрыла бы разрыв при нынешней скорости (null — одной выносливостью не закрыть).
 */
export function raceGap(s: GameState, id: RaceId) {
  const r = race(id)
  const eta = forecast(s, r.km)
  const v = runSpeed(s)
  const kNeed = Math.log((r.cutoff * v) / 60) / Math.log(r.km)
  const stamina = r.km > 1 && kNeed > RUNNER.fatigueBase ? RUNNER.fatigueExtra / (kNeed - RUNNER.fatigueBase) : null
  return {
    ok: eta <= r.cutoff,
    paceGap: ((eta - r.cutoff) * 60) / r.km,
    speedPct: (eta / r.cutoff - 1) * 100,
    stamina,
    staminaNow: statMult(s, 'stamina'),
  }
}

/** Награда за пойманный гель: ~30 с автодохода, но не меньше 5 рывков в начале игры. */
export const gelReward = (s: GameState) => Math.max(kmPerSec(s) * 30, clickValue(s) * 5)

export function catchGel(s: GameState): number {
  const km = gelReward(s)
  earn(s, km)
  return km
}

/** Ровная скорость на трассе, км за реальную секунду: дистанция ÷ прогноз. */
export const raceSpeed = (s: GameState, id: RaceId) =>
  (s.activeRace?.id === id && s.activeRace.pace) || race(id).km / forecast(s, race(id).km)

/** Пункты питания забега (доли дистанции) и сколько сил остаётся на финише ровным бегом без гелей (на ультра < 0) */
export const raceFeeds = (id: RaceId): readonly number[] => (race(id) as { feeds?: readonly number[] }).feeds ?? RUNNER.feeds
const raceReserve = (id: RaceId) => (race(id) as { reserve?: number }).reserve ?? RUNNER.reserve
/** Расход сил на километр ровного бега. */
const drainPerKm = (id: RaceId) => (1 - raceReserve(id)) / race(id).km

/** Во сколько раз метр рывка дороже метра ровного бега. Выносливость делает спринт дешевле. */
const sprintFactor = (s: GameState) => 1 + RUNNER.sprintCost / statMult(s, 'stamina') ** 0.25

/** Сколько км даёт рывок на дистанции. */
export const tapKm = (s: GameState, id: RaceId) =>
  race(id).km * (RUNNER.tapFrac + RUNNER.tapFracPerTechnique * s.boosts.technique)

/** Цена рывка в силах. */
export const tapEnergy = (s: GameState, id: RaceId) => tapKm(s, id) * drainPerKm(id) * sprintFactor(s)

/** Сколько сил ещё вернут гели впереди, если ловить все */
const gelsAhead = (a: ActiveRace) => (raceFeeds(a.id).length - a.fed) * RUNNER.feedEnergy

/** Время на оставшейся дистанции с учётом «стены», когда силы кончатся (гели впереди считаем пойманными). */
function timeLeft(s: GameState, a: ActiveRace): number {
  const v = raceSpeed(s, a.id)
  const rest = race(a.id).km - a.covered
  const onEnergy = Math.min(rest, (a.energy + gelsAhead(a)) / drainPerKm(a.id))
  return onEnergy / v + (rest - onEnergy) / (v * RUNNER.wallSpeed)
}

/** Живые показатели забега для экрана. */
export function raceLive(s: GameState) {
  const a = s.activeRace
  if (!a) return null
  const r = race(a.id)
  const need = (r.km - a.covered) * drainPerKm(a.id) // сколько сил нужно до финиша ровным бегом
  return {
    finish: a.elapsed + timeLeft(s, a),
    energy: a.energy,
    need,
    gelsAhead: gelsAhead(a), // столько сил ещё вернут гели на пунктах питания
    // масштаб шкалы сил: на ультра до финиша нужно больше полного запаса (1 − reserve > 1) — шкала вмещает всю потребность,
    // иначе отметка «нужно» стояла у правого края до середины забега
    scale: Math.max(1, 1 - raceReserve(a.id)),
    wall: a.energy <= 0,
    canTap: a.energy >= tapEnergy(s, a.id),
    speed: raceSpeed(s, a.id) * (a.energy > 0 ? 1 : RUNNER.wallSpeed),
  }
}

/**
 * Лучший возможный финиш: все силы сверх нужных на ровный бег, плюс гели на пунктах питания,
 * уходят в рывки. Если он в лимите, а обычный прогноз нет — стартовать можно, но придётся играть.
 */
export function bestForecast(s: GameState, id: RaceId): number {
  // каждый метр рывка экономит метр ровного бега, поэтому чистая цена — (sprintFactor − 1)
  const surplus = raceReserve(id) + raceFeeds(id).length * RUNNER.feedEnergy
  const saved = Math.max(0, Math.min(surplus / ((1 - raceReserve(id)) * (sprintFactor(s) - 1)), 0.5))
  return forecast(s, race(id).km) * (1 - saved)
}

/** Пора выпустить гель пункта питания? Отмечает пункт пройденным. */
export function feedDue(s: GameState): boolean {
  const a = s.activeRace
  const feeds = a ? raceFeeds(a.id) : []
  if (!a || a.fed >= feeds.length) return false
  if (a.covered / race(a.id).km < feeds[a.fed]) return false
  a.fed++
  return true
}

/** Гель на трассе: возвращает силы. */
export function catchRaceGel(s: GameState): number {
  const a = s.activeRace
  if (!a) return 0
  const before = a.energy
  a.energy = Math.min(1, a.energy + RUNNER.feedEnergy)
  return a.energy - before
}

/** place — место среди FIELD[id] стартовавших (только у финиша); replay — повтор пройденной дистанции, prevBest — рекорд до него */
export type RaceResult = { id: RaceId; ok: boolean; time: number; covered: number; gaveUp?: boolean; place?: number; replay?: boolean; prevBest?: number }

/** Сойти с дистанции добровольно: сход без награды, весь прогресс остаётся. */
export function abandonRace(s: GameState): RaceResult | null {
  const a = s.activeRace
  if (!a) return null
  s.activeRace = null
  return { id: a.id, ok: false, time: a.elapsed, covered: a.covered, gaveUp: true }
}

// --- офлайн ---

/** Лимит офлайна, часы: растёт с уровнями «Бегового клуба» */
export const offlineHours = (s: GameState) => Math.min(OFFLINE.maxHours, OFFLINE.baseHours + OFFLINE.hoursPerClub * s.owned.club)
/** Доля дохода, которая идёт офлайн: растёт с уровнями «Личного тренера» */
export const offlineEff = (s: GameState) => Math.min(OFFLINE.maxEff, OFFLINE.baseEff + OFFLINE.effPerCoach * s.owned.coach)

export type OfflineReport = { away: number; counted: number; km: number; eff: number; hours: number; racePaused: boolean }

/** Начисляет доход за отсутствие: не дольше лимита, с понижающим коэффициентом. Забег не двигается. */
export function applyOffline(s: GameState, awaySec: number): OfflineReport {
  const counted = Math.min(awaySec, offlineHours(s) * 3600)
  const km = kmPerSec(s) * counted * offlineEff(s)
  earn(s, km)
  return { away: awaySec, counted, km, eff: offlineEff(s), hours: offlineHours(s), racePaused: !!s.activeRace }
}

// --- действия ---

function earn(s: GameState, km: number) {
  s.km += km
  s.totalKm += km
}

export type DashHit = keyof typeof RUNNER.timing.mult

/** Тап: км на тренировке; на забеге — рывок (hit — куда попал указатель шкалы рывка). */
export function click(s: GameState, hit: DashHit = 'good') {
  s.clicks++
  earn(s, clickValue(s))
  raceTap(s, hit)
}

/** Рывок на трассе: продвигает вперёд за счёт сил. Без сил — ничего не даёт. */
export function raceTap(s: GameState, hit: DashHit = 'good'): boolean {
  const a = s.activeRace
  if (!a || a.energy < tapEnergy(s, a.id)) return false
  a.energy -= tapEnergy(s, a.id) // силы — как за обычный рывок, дальность — по попаданию
  a.covered = Math.min(a.covered + tapKm(s, a.id) * RUNNER.timing.mult[hit], race(a.id).km)
  return true
}

/** Покупает n уровней тренировки разом (×1 / ×10 / ×100). */
export function buyGen(s: GameState, id: GenId, n = 1): boolean {
  const cost = genCostN(id, s.owned[id], n)
  if (!genUnlocked(s, id) || s.km < cost) return false
  s.km -= cost
  s.owned[id] += n
  return true
}

export function buyUpgrade(s: GameState, id: UpgradeId): boolean {
  const cost = upgrade(id).cost
  if (!upgradeVisible(s, id) || s.km < cost) return false
  s.km -= cost
  s.upgrades.push(id)
  return true
}

export function buyBoost(s: GameState, id: BoostId): boolean {
  const next = nextBoost(s, id)
  if (!next || !boostUnlocked(s, id) || s.km < next.cost) return false
  s.km -= next.cost
  s.boosts[id]++
  return true
}

export function startRace(s: GameState, id: RaceId): boolean {
  if (!canStartRace(s, id)) return false
  s.activeRace = { id, elapsed: 0, covered: 0, energy: 1, fed: 0, pace: race(id).km / forecast(s, race(id).km), seed: (Math.random() * 2 ** 31) | 0 }
  return true
}

/**
 * Продвигает игру на dt секунд. Возвращает результат забега, если он завершился в этом тике:
 * финиш в лимит — награда; лимит истёк раньше финиша — сход без награды.
 */
/** Во сколько раз быстрее течёт время на трассе этого забега (ультра сжаты до ~3 минут реального времени) */
export const raceTimeScale = (id: RaceId) => Math.max(1, race(id).cutoff / RUNNER.raceRealSec)

export function tick(s: GameState, dt: number): RaceResult | null {
  earn(s, kmPerSec(s) * dt)
  // забег — мелкими шагами, чтобы точно поймать момент «стены» (важно для оффлайна)
  const raceDt = s.activeRace ? dt * raceTimeScale(s.activeRace.id) : 0
  for (let left = raceDt; left > 0 && s.activeRace; left -= 0.25) {
    const done = raceStep(s, Math.min(left, 0.25))
    if (done) return done
  }
  return null
}

function raceStep(s: GameState, dt: number): RaceResult | null {
  const a = s.activeRace!
  const r = race(a.id)
  const speed = raceSpeed(s, a.id) * (a.energy > 0 ? 1 : RUNNER.wallSpeed)
  const toFinish = (r.km - a.covered) / speed
  if (toFinish <= dt && a.elapsed + toFinish <= r.cutoff) {
    const time = a.elapsed + toFinish
    const replay = s.races.includes(a.id)
    const prevBest = s.bestTimes[a.id]
    // медаль и множитель — только за первый финиш; повтор лишь обновляет рекорд
    if (!replay) {
      s.races.push(a.id)
      s.medals++
    }
    s.bestTimes[a.id] = Math.min(time, prevBest ?? Infinity)
    s.activeRace = null
    return { id: a.id, ok: true, time, covered: r.km, place: finishPlace(a.id, a.seed ?? 0, time), replay, prevBest }
  }
  const toCutoff = r.cutoff - a.elapsed
  if (toCutoff <= dt) {
    s.activeRace = null
    return { id: a.id, ok: false, time: r.cutoff, covered: a.covered + speed * toCutoff }
  }
  a.elapsed += dt
  a.covered += speed * dt
  if (a.energy > 0) a.energy = Math.max(0, a.energy - speed * dt * drainPerKm(a.id))
  return null
}

// --- форматирование ---

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi']

export function fmt(n: number): string {
  if (n < 10) return n.toFixed(2).replace(/\.?0+$/, '') || '0'
  if (n < 1000) return n.toFixed(n < 100 ? 1 : 0).replace(/\.0$/, '')
  const tier = Math.floor(Math.log10(n) / 3)
  if (tier >= SUFFIXES.length) return n.toExponential(2)
  const v = n / 1000 ** tier
  return v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0) + SUFFIXES[tier]
}

/** Минуты → «1:05:00» или «38:20». */
export function fmtClock(min: number): string {
  const t = Math.round(min * 60)
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const sec = String(t % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/** Скорость, км/ч → темп «6:12 /км». */
export const fmtPace = (kmh: number) => fmtClock(60 / kmh) + ' /км'

export function fmtTime(sec: number): string {
  if (sec < 60) return `${Math.ceil(sec)} с`
  if (sec < 3600) return `${Math.floor(sec / 60)} мин ${Math.floor(sec % 60)} с`
  return `${Math.floor(sec / 3600)} ч ${Math.floor((sec % 3600) / 60)} мин`
}
