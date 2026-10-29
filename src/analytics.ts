// Анонимная статистика плейтеста → PostHog (HTTP API /batch, без SDK).
// Без имён и личных данных: случайный id игрока в этом браузере + игровые события.
// Игрок может выключить статистику в настройках. В dev-сборке ничего не отправляется.
import { ref } from 'vue'
import { income } from './game/logic.ts'
import { state } from './game/state.ts'
import { lang } from './i18n/index.ts'

const API_KEY = 'phc_sQBsDea6EpnJTgJveep57PA2anvie3Z7xTgXcYmSrEyK' // публичный ключ проекта: им можно только отправлять события
const HOST = 'https://us.i.posthog.com' // регион проекта: us или eu
const ENABLED = import.meta.env.PROD

// --- согласие: по умолчанию включено, выключается в настройках ---
const OPT_KEY = 'ultramarathon-analytics'
const read = (k: string) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* хранилище недоступно */
  }
}
export const analyticsOn = ref(read(OPT_KEY) !== 'off')
export function setAnalytics(on: boolean) {
  analyticsOn.value = on
  write(OPT_KEY, on ? 'on' : 'off')
  if (!on) queue.length = 0
}

// --- анонимный id и время игры ---
const ID_KEY = 'ultramarathon-anon-id'
const playerId =
  read(ID_KEY) ??
  (() => {
    const id = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
    write(ID_KEY, id)
    return id
  })()
const PLAY_KEY = 'ultramarathon-play-sec'
/** Секунды активной игры (вкладка открыта) с первого запуска — чтобы мерить «сколько минут до забега» */
let playSec = Number(read(PLAY_KEY)) || 0
setInterval(() => {
  if (document.hidden) return
  playSec += 5
  write(PLAY_KEY, String(playSec))
}, 5000)

/** Счётчики текущего забега: рывки и пойманные гели */
export const raceStats = { taps: 0, gels: 0 }

// --- отправка пачками: раз в 10 с и при сворачивании вкладки ---
type Event = { event: string; properties: Record<string, unknown>; timestamp: string }
const queue: Event[] = []

/** Записать событие. Общие поля (время игры, прогресс, язык) добавляются сами. */
export function track(event: string, props: Record<string, unknown> = {}) {
  if (!ENABLED || !analyticsOn.value) return
  queue.push({
    event,
    timestamp: new Date().toISOString(),
    properties: {
      distinct_id: playerId,
      $process_person_profile: false, // только события, без профилей людей
      play_min: Math.round(playSec / 6) / 10,
      races_done: state.races.length,
      income_kmh: Math.round(income(state)),
      lang: lang.value,
      ...props,
    },
  })
  if (queue.length >= 20) flush()
}

function flush(beacon = false) {
  if (!queue.length) return
  const body = JSON.stringify({ api_key: API_KEY, batch: queue.splice(0) })
  try {
    if (beacon && navigator.sendBeacon) navigator.sendBeacon(`${HOST}/batch/`, new Blob([body], { type: 'application/json' }))
    else void fetch(`${HOST}/batch/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
  } catch {
    /* сеть недоступна — статистика не критична */
  }
}
setInterval(flush, 10_000)
document.addEventListener('visibilitychange', () => document.hidden && flush(true))
addEventListener('pagehide', () => flush(true))
