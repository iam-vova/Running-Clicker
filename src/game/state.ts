// Единственный экземпляр состояния игры + цикл, сейвы и оффлайн-прогресс.
import { reactive, ref } from 'vue'
import { OFFLINE } from './config.ts'
import { SAVE_VERSION, applyOffline, income, kmPerSec, newState, tick } from './logic.ts'
import type { GameState, OfflineReport, RaceResult } from './logic.ts'
import { cloudSave, platformPaused } from '../platform.ts'

const SAVE_KEY = 'ultramarathon-save'

export const state = reactive<GameState>(load())
/** Сообщение-тост: оффлайн-доход, финиш забега и т.п. */
export const toast = ref<string | null>(null)
/** Игра на паузе (например, пока открыто окно «Пока тебя не было») */
export const paused = ref(false)

function load(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return newState()
    let saved = JSON.parse(raw)
    // v1 → v2: апгрейд «Нормальные кроссовки» стал первым уровнем ветки «Кроссовки»
    if (saved.version === 1) {
      const ups: string[] = saved.upgrades ?? []
      saved = { ...saved, version: 2, upgrades: ups.filter((u) => u !== 'shoes'), boosts: { shoes: ups.includes('shoes') ? 1 : 0 } }
    }
    // v2 → v3: апгрейд «Каденс 180» стал первым уровнем ветки «Техника бега»; темп считается в км/ч
    if (saved.version === 2) {
      const ups: string[] = saved.upgrades ?? []
      saved = { ...saved, version: 3, upgrades: ups.filter((u) => u !== 'cadence'), boosts: { ...saved.boosts, technique: ups.includes('cadence') ? 1 : 0 } }
    }
    // v3 → v4: забег идёт по прогнозу финиша; у активного забега появился total
    if (saved.version === 3) {
      saved = { ...saved, version: 4, activeRace: saved.activeRace ? { ...saved.activeRace, total: 30 } : null }
    }
    // v4 → v5: забег стал активным (elapsed/covered); незаконченный старый забег отменяем
    if (saved.version === 4) saved = { ...saved, version: 5, activeRace: null }
    // v5 → v6: появился выбор персонажа; старые сейвы играли бегуном
    if (saved.version === 5) saved = { ...saved, version: 6, character: 'he' }
    // v6 → v7: медали за уже пройденные забеги, лучшие времена неизвестны
    if (saved.version === 6) saved = { ...saved, version: 7, medals: (saved.races ?? []).length, bestTimes: {} }
    // v7 → v8: на забеге появился запас сил и пункты питания
    if (saved.version === 7) {
      const a = saved.activeRace
      saved = { ...saved, version: 8, activeRace: a ? { ...a, energy: 0.5, fed: 2 } : null }
    }
    // v8 → v9: офлайн с лимитом и эффективностью (от «Бегового клуба» и «Личного тренера»)
    if (saved.version === 8) saved = { ...saved, version: 9 }
    // v9 → v10: в «Еде» финики и мармелад стали двумя уровнями — купленные гели (бывший 4-й) теперь 5-й
    if (saved.version === 9) saved = { ...saved, version: 10, boosts: { ...saved.boosts, food: (saved.boosts?.food ?? 0) >= 4 ? 5 : saved.boosts?.food ?? 0 } }
    delete saved.offline // недолго жившие отдельные улучшения офлайна
    if (saved.version !== SAVE_VERSION) return newState()
    const base = newState()
    return { ...base, ...saved, owned: { ...base.owned, ...saved.owned }, boosts: { ...base.boosts, ...saved.boosts } }
  } catch {
    return newState()
  }
}

/** force — уходим со страницы: в облако сразу, без ограничения частоты */
export function save(force = false) {
  state.lastSave = Date.now()
  const json = JSON.stringify(state)
  try {
    localStorage.setItem(SAVE_KEY, json)
  } catch {
    /* хранилище недоступно — играем без сейвов */
  }
  cloudSave(json, force)
}

export function resetGame() {
  Object.assign(state, newState())
  save(true)
}

let toastTimer = 0
export function showToast(text: string) {
  toast.value = text
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => (toast.value = null), 4000)
}

/**
 * Отсутствие: короткое (< минуты) засчитываем как обычную игру, длинное — по правилам офлайна
 * (лимит часов, пониженная эффективность, забег на паузе). Возвращает отчёт, если был офлайн.
 */
function settleAway(sec: number): OfflineReport | null {
  if (sec <= 0 || income(state) <= 0) return null
  if (sec < OFFLINE.minAwaySec) {
    state.km += kmPerSec(state) * sec
    state.totalKm += kmPerSec(state) * sec
    return null
  }
  return applyOffline(state, sec)
}

export function startGame(onRaceFinish: (r: RaceResult) => void, onReturn: (r: OfflineReport) => void) {
  const first = settleAway((Date.now() - state.lastSave) / 1000)
  if (first) onReturn(first)

  // пока вкладка скрыта, игра стоит; при возвращении время начисляется как офлайн
  let hiddenAt = 0
  let last = performance.now()
  setInterval(() => {
    const now = performance.now()
    const dt = (now - last) / 1000
    last = now
    if (document.hidden || paused.value || platformPaused.value) return
    const done = tick(state, dt)
    if (done) onRaceFinish(done)
  }, 100)

  setInterval(save, 10_000)
  addEventListener('beforeunload', () => save(true))
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenAt = Date.now()
      save(true)
    } else if (hiddenAt) {
      last = performance.now()
      const report = settleAway((Date.now() - hiddenAt) / 1000)
      hiddenAt = 0
      if (report) onReturn(report)
    }
  })
}
