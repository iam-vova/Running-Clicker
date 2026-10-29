// Ход игры вокруг забегов: финиш (добегание → празднование → окно результата), сход, повтор,
// и возвращение после офлайна. Запускается один раз из App.
import { ref } from 'vue'
import { GENERATORS, RACES } from '../game/config.ts'
import type { GenId, RaceId } from '../game/config.ts'
import { FIELD } from '../game/field.ts'
import { abandonRace, canStartRace, startRace } from '../game/logic.ts'
import type { OfflineReport, RaceResult } from '../game/logic.ts'
import { paused, startGame, state } from '../game/state.ts'
import { sfx } from '../sound.ts'
import { useSheets } from './useSheets.ts'
import { useRace } from './useRace.ts'
import { raceStats, track } from '../analytics.ts'

/** Итог последней попытки — окно результата и строка в окне «Забег» */
export type Result = {
  id: RaceId
  km: number
  ok: boolean
  covered: number
  time: number
  cutoff: number
  unlocked: GenId | null // какая тренировка открылась
  next: RaceId | null // следующая дистанция
  gaveUp: boolean // сошёл сам, а не обогнала тень
  place: number | null // место на финише
  field: number // сколько стартовало
}

const FINISH_RUNOUT = 1300 // мс: бегун пробегает арку и отбегает от неё
const FINISH_CELEBRATE = 1600 // мс: два цикла анимации победы, потом окно результата

const lastResult = ref<Result | null>(null)
const showResult = ref(false)
/** Добегание после финиша: бегун ещё бежит, чтобы пересечь арку */
const runout = ref(false)
/** Празднует финиш */
const celebrating = ref(false)
/** Отчёт «Пока тебя не было» */
const away = ref<OfflineReport | null>(null)

const { sheet, closeSheet } = useSheets()

function onRaceFinish(res: RaceResult) {
  if (res.ok) {
    sfx.finish()
    sfx.cheer(2.4, true)
  }
  else sfx.dnf()
  const r = RACES.find((r) => r.id === res.id)!
  track(res.ok ? 'race_finish' : 'race_dnf', {
    race: r.id,
    time_min: +res.time.toFixed(2),
    cutoff_min: r.cutoff,
    covered_km: +res.covered.toFixed(2),
    distance_km: r.km,
    gave_up: !!res.gaveUp,
    taps: raceStats.taps,
    gels: raceStats.gels,
    perfect: raceStats.perfect,
    place: res.place ?? null,
  })
  lastResult.value = {
    id: r.id,
    km: r.km,
    ok: res.ok,
    covered: res.covered,
    time: res.time,
    cutoff: r.cutoff,
    unlocked: GENERATORS.find((g) => g.unlockRace === r.id)?.id ?? null,
    next: RACES.find((x) => !state.races.includes(x.id))?.id ?? null,
    gaveUp: !!res.gaveUp,
    place: res.place ?? null,
    field: FIELD[r.id],
  }
  closeSheet()
  if (!res.ok) {
    showResult.value = true
    return
  }
  // победа: бегун пробегает под аркой, празднует, и только потом окно результата
  runout.value = true
  setTimeout(() => {
    runout.value = false
    celebrating.value = true
  }, FINISH_RUNOUT)
  setTimeout(() => {
    closeSheet()
    showResult.value = true
  }, FINISH_RUNOUT + FINISH_CELEBRATE)
  setTimeout(() => (celebrating.value = false), FINISH_RUNOUT + FINISH_CELEBRATE + 1000)
}

/** «Сдаться»: сход без награды, прогресс остаётся */
function quitRace() {
  const res = abandonRace(state)
  if (res) onRaceFinish(res)
}
/** «Ещё раз» после схода */
function retry() {
  showResult.value = false
  const id = lastResult.value?.id
  if (id && canStartRace(state, id) && startRace(state, id)) useRace().onStarted(id)
}
/** «Прокачаться» после схода — сразу в снаряжение */
function goTrain() {
  showResult.value = false
  sheet.value = 'gear'
}
function closeResult() {
  showResult.value = false
}
/** Сброс прогресса: итог прошлого забега больше не относится к игре */
function clearResults() {
  lastResult.value = null
  showResult.value = false
}
function closeAway() {
  away.value = null
  paused.value = false
}

let started = false
/** Запуск игрового цикла: тики, сейвы, офлайн. Пока открыт отчёт об офлайне, забег на паузе. */
function startFlow() {
  if (started) return
  started = true
  track('app_open')
  startGame(onRaceFinish, (report) => {
    track('offline_return', { away_min: Math.round(report.away / 60), counted_min: Math.round(report.counted / 60), km: Math.round(report.km) })
    away.value = report
    paused.value = true
  })
}

export const useRaceFlow = () => ({
  lastResult, showResult, runout, celebrating, away,
  quitRace, retry, goTrain, closeResult, closeAway, clearResults, startFlow,
})
