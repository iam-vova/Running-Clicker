// Площадка. На Яндекс Играх (сборка `npm run build:yandex` подключает их /sdk.js) — SDK: язык, разметка геймплея,
// пауза по событиям площадки, облачные сохранения, реклама за награду. Без SDK (GitHub Pages, превью) всё — заглушки,
// игра работает как обычно.
import { ref, watchEffect } from 'vue'

/** Нужная нам часть SDK Яндекс Игр (https://yandex.ru/dev/games/doc/ru/sdk/sdk-about) */
type Callbacks = { onOpen?: () => void; onRewarded?: () => void; onClose?: (shown: boolean) => void; onError?: (e: unknown) => void }
type Player = { getData(keys?: string[]): Promise<Record<string, unknown>>; setData(d: Record<string, unknown>, flush?: boolean): Promise<void> }
type Ysdk = {
  environment: { i18n: { lang: string } }
  features: { LoadingAPI?: { ready(): void }; GameplayAPI?: { start(): void; stop(): void } }
  adv: { showRewardedVideo(o: { callbacks: Callbacks }): void }
  on(event: 'game_api_pause' | 'game_api_resume', fn: () => void): void
  getPlayer(): Promise<Player>
}
declare global {
  interface Window {
    YaGames?: { init(): Promise<Ysdk> }
  }
}

let ysdk: Ysdk | null = null
let player: Player | null = null
const SAVE_KEY = 'ultramarathon-save'

/** Площадка поставила игру на паузу (своё меню, реклама) — игра и звук стоят */
export const platformPaused = ref(false)
/** Можно предложить рекламу за награду */
export const canReward = ref(false)

const withTimeout = <T>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))])

/**
 * До запуска игры: SDK и облачное сохранение. Облачное новее локального — кладём его в localStorage,
 * откуда игра читает сейв как обычно. Без SDK или при ошибке — тихо продолжаем без площадки.
 */
export async function initPlatform() {
  if (!window.YaGames) return
  try {
    ysdk = await withTimeout(window.YaGames.init(), 8000)
    canReward.value = true
    ysdk.on('game_api_pause', () => (platformPaused.value = true))
    ysdk.on('game_api_resume', () => (platformPaused.value = false))
    player = await withTimeout(ysdk.getPlayer(), 5000)
    const { save } = await withTimeout(player.getData(['save']), 5000)
    if (typeof save === 'string') {
      const local = localStorage.getItem(SAVE_KEY)
      const at = (s: string | null) => (s ? (JSON.parse(s).lastSave ?? 0) : 0)
      if (at(save) > at(local)) localStorage.setItem(SAVE_KEY, save)
    }
  } catch {
    // SDK не ответил или облако недоступно — играем на локальном сейве
  }
}

/** Язык интерфейса площадки ('ru', 'tr', …) или null */
export const platformLang = () => ysdk?.environment.i18n.lang ?? null

const visible = ref(!document.hidden)
document.addEventListener('visibilitychange', () => (visible.value = !document.hidden))

/** Игра загружена и готова к действиям игрока; дальше площадка знает, идёт ли игра */
export function platformReady() {
  if (!ysdk) return
  ysdk.features.LoadingAPI?.ready()
  watchEffect(() => setGameplay(visible.value && !platformPaused.value))
}

let playing: boolean | null = null
/** Разметка геймплея: идёт игра или стоит (вкладка скрыта, пауза площадки, реклама) */
function setGameplay(on: boolean) {
  if (!ysdk || playing === on) return
  playing = on
  if (on) ysdk.features.GameplayAPI?.start()
  else ysdk.features.GameplayAPI?.stop()
}

let lastCloud = 0
/** Сейв в облако: не чаще раза в 30 с (лимит площадки — 100 запросов за 5 минут); force — при уходе со страницы */
export function cloudSave(json: string, force = false) {
  if (!player || (!force && Date.now() - lastCloud < 30_000)) return
  lastCloud = Date.now()
  void player.setData({ save: json }, force).catch(() => {})
}

/** Реклама за награду. true — досмотрел, награду выдать. На время показа игра и звук на паузе. */
export function showRewarded(): Promise<boolean> {
  if (!ysdk) return Promise.resolve(false)
  return new Promise((resolve) => {
    let rewarded = false
    platformPaused.value = true
    ysdk!.adv.showRewardedVideo({
      callbacks: {
        onRewarded: () => (rewarded = true),
        onClose: () => {
          platformPaused.value = false
          resolve(rewarded)
        },
        onError: () => {
          platformPaused.value = false
          resolve(false)
        },
      },
    })
  })
}
