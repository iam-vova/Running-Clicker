// Забеги глазами интерфейса: следующий старт и готовность к нему, живые показатели на трассе.
import { computed, watch } from 'vue'
import { GENERATORS, RACES } from '../game/config.ts'
import type { RaceId } from '../game/config.ts'
import { bestForecast, forecast, raceLive, raceReady, startRace, tapKm } from '../game/logic.ts'
import { state } from '../game/state.ts'
import { t } from '../i18n/index.ts'
import { genName } from '../i18n/names.ts'
import { xMult } from '../utils/format.ts'
import { sfx } from '../sound.ts'

type Race = (typeof RACES)[number]

const nextRace = computed<Race | null>(() => RACES.find((r) => !state.races.includes(r.id)) ?? null)
const activeRace = computed<Race | null>(() => (state.activeRace ? RACES.find((r) => r.id === state.activeRace!.id)! : null))

/** Прогноз финиша следующего забега, минуты */
const eta = computed(() => (nextRace.value ? forecast(state, nextRace.value.km) : 0))
/** Лучший финиш, если тратить все лишние силы и гели на рывки */
const etaBest = computed(() => (nextRace.value ? bestForecast(state, nextRace.value.id) : 0))
/** Средняя скорость на дистанции по прогнозу, км/ч */
const avgSpeed = computed(() => (nextRace.value ? (nextRace.value.km / eta.value) * 60 : 0))
/** Прогноз минус лимит, минуты: > 0 — не успеваешь */
const gap = computed(() => (nextRace.value ? eta.value - nextRace.value.cutoff : 0))
/** ok — успеваешь ровным бегом; maybe — только с рывками и гелями; late — не успеть */
const readiness = computed(() =>
  !nextRace.value || gap.value <= 0 ? 'ok' : etaBest.value <= nextRace.value.cutoff ? 'maybe' : 'late',
)
const readyPct = computed(() => (nextRace.value ? Math.min(nextRace.value.cutoff / eta.value, 1) : 1))
const raceStatus = (id: RaceId) => (state.races.includes(id) ? 'done' : nextRace.value?.id === id ? 'next' : 'locked')
/** Награда за забег: «доход ×1,5» */
export const raceReward = (id: RaceId) => t('race.reward', { x: xMult(RACES.find((r) => r.id === id)!.mult) })
/** Награда целиком: множитель + тренировка, которую открывает забег */
function rewardText(r: Race) {
  const g = GENERATORS.find((g) => g.unlockRace === r.id)
  const reward = raceReward(r.id)
  return g ? t('race.rewardWithTraining', { reward, name: genName(g.id) }) : reward
}

// --- на трассе ---
const live = computed(() => {
  const a = state.activeRace
  const r = activeRace.value
  if (!a || !r) return null
  const runner = a.covered / r.km
  const ghost = Math.min(a.elapsed / r.cutoff, 1) // где сейчас тень лимита, доля дистанции
  return {
    ...raceLive(state)!,
    runner,
    ghost,
    leadM: (runner - ghost) * r.km * 1000, // отрыв от тени лимита, м (минус — тень впереди)
    tapM: tapKm(state, r.id) * 1000,
  }
})
/** Сколько секунд бежать до финиша (секунда = минута на трассе) */
const timeLeft = () => (live.value && state.activeRace ? Math.max(0, live.value.finish - state.activeRace.elapsed) : 0)

// удар о «стену», когда силы кончились
watch(
  () => live.value?.wall,
  (w, was) => w && !was && sfx.wall(),
)

/** Старт следующего забега */
function go(): boolean {
  if (!nextRace.value || !startRace(state, nextRace.value.id)) return false
  sfx.start()
  return true
}

export const useRace = () => ({
  nextRace, activeRace, eta, etaBest, avgSpeed, gap, readiness, readyPct, raceStatus, rewardText,
  live, timeLeft, go, ready: (id: RaceId) => raceReady(state, id),
})
