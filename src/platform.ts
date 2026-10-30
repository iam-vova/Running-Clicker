// Площадка: Яндекс Игры или CrazyGames — по тому, чей SDK подключила сборка (`npm run build:yandex` / `build:crazy`).
// Язык, разметка геймплея, пауза и звук по требованиям площадки, облачные сохранения, реклама за награду.
// Без SDK (GitHub Pages, превью) всё — заглушки, игра работает как обычно.
import { ref, watchEffect } from 'vue'

/** Нужная нам часть SDK Яндекс Игр (https://yandex.ru/dev/games/doc/ru/sdk/sdk-about) */
type YaCallbacks = { onOpen?: () => void; onRewarded?: () => void; onClose?: (shown: boolean) => void; onError?: (e: unknown) => void }
type YaPlayer = { getData(keys?: string[]): Promise<Record<string, unknown>>; setData(d: Record<string, unknown>, flush?: boolean): Promise<void> }
type Ysdk = {
  environment: { i18n: { lang: string } }
  features: { LoadingAPI?: { ready(): void }; GameplayAPI?: { start(): void; stop(): void } }
  adv: { showRewardedVideo(o: { callbacks: YaCallbacks }): void }
  on(event: 'game_api_pause' | 'game_api_resume', fn: () => void): void
  getPlayer(): Promise<YaPlayer>
}
/** Нужная нам часть CrazyGames SDK v3 (https://docs.crazygames.com/sdk/intro/) */
type CrazySdk = {
  init(): Promise<void>
  environment: 'local' | 'crazygames' | 'disabled'
  game: {
    loadingStart(): void
    loadingStop(): void
    gameplayStart(): void
    gameplayStop(): void
    happytime(): void
    settings: { muteAudio: boolean }
    addSettingsChangeListener(fn: (s: { muteAudio: boolean }) => void): void
  }
  ad: { requestAd(type: 'rewarded', cb: { adStarted?: () => void; adFinished?: () => void; adError?: (e: unknown) => void }): void }
  data: { getItem(key: string): string | null; setItem(key: string, value: string): void }
}
declare global {
  interface Window {
    YaGames?: { init(): Promise<Ysdk> }
    CrazyGames?: { SDK: CrazySdk }
  }
}

/** Что игра просит у площадки */
type Platform = {
  name: 'yandex' | 'crazygames'
  lang(): string | null
  ready(): void
  /** visible — вкладка видна: Яндекс хочет stop при уходе со вкладки, CrazyGames следит за этим сам */
  gameplay(on: boolean, visible: boolean): void
  save(json: string, force: boolean): void
  rewarded(cb: { started(): void; done(ok: boolean): void }): void
  celebrate(): void
}

let platform: Platform | null = null
const SAVE_KEY = 'ultramarathon-save'

/** Площадка поставила игру на паузу (своё меню, реклама) — игра и звук стоят */
export const platformPaused = ref(false)
/** Площадка просит выключить звук (настройка CrazyGames), главнее внутриигровой */
export const platformMuted = ref(false)
/** Можно предложить рекламу за награду */
export const canReward = ref(false)
/** На какой площадке игра: null — обычный веб */
export const platformName = () => platform?.name ?? null

const withTimeout = <T>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))])

/** Облачный сейв новее локального — кладём его в localStorage, откуда игра читает сейв как обычно */
function adoptCloud(cloud: unknown) {
  if (typeof cloud !== 'string') return
  const at = (s: string | null) => (s ? (JSON.parse(s).lastSave ?? 0) : 0)
  if (at(cloud) > at(localStorage.getItem(SAVE_KEY))) localStorage.setItem(SAVE_KEY, cloud)
}

async function yandex(): Promise<Platform> {
  const ysdk = await withTimeout(window.YaGames!.init(), 8000)
  ysdk.on('game_api_pause', () => (platformPaused.value = true))
  ysdk.on('game_api_resume', () => (platformPaused.value = false))
  let player: YaPlayer | null = null
  try {
    player = await withTimeout(ysdk.getPlayer(), 5000)
    adoptCloud((await withTimeout(player.getData(['save']), 5000)).save)
  } catch {
    // облако недоступно — играем на локальном сейве
  }
  let lastCloud = 0
  return {
    name: 'yandex',
    lang: () => ysdk.environment.i18n.lang,
    ready: () => ysdk.features.LoadingAPI?.ready(),
    gameplay: (on, visible) => (on && visible ? ysdk.features.GameplayAPI?.start() : ysdk.features.GameplayAPI?.stop()),
    // не чаще раза в 30 с (лимит площадки — 100 запросов за 5 минут); при уходе со страницы — сразу
    save(json, force) {
      if (!player || (!force && Date.now() - lastCloud < 30_000)) return
      lastCloud = Date.now()
      void player.setData({ save: json }, force).catch(() => {})
    },
    rewarded({ started, done }) {
      let ok = false
      ysdk.adv.showRewardedVideo({
        callbacks: { onOpen: started, onRewarded: () => (ok = true), onClose: () => done(ok), onError: () => done(false) },
      })
    },
    celebrate: () => {},
  }
}

async function crazy(): Promise<Platform | null> {
  const sdk = window.CrazyGames!.SDK
  await withTimeout(sdk.init(), 8000)
  if (sdk.environment === 'disabled') return null
  sdk.game.loadingStart()
  platformMuted.value = sdk.game.settings.muteAudio
  sdk.game.addSettingsChangeListener((s) => (platformMuted.value = s.muteAudio))
  try {
    adoptCloud(sdk.data.getItem('save'))
  } catch {
    // модуль данных выключен (dataModuleDisabled) — локальный сейв
  }
  return {
    name: 'crazygames',
    lang: () => null, // язык — из браузера
    ready: () => sdk.game.loadingStop(),
    gameplay: (on) => (on ? sdk.game.gameplayStart() : sdk.game.gameplayStop()),
    // модуль данных сам копит записи и отправляет пачкой
    save(json) {
      try {
        sdk.data.setItem('save', json)
      } catch {
        /* модуль данных выключен */
      }
    },
    rewarded({ started, done }) {
      sdk.ad.requestAd('rewarded', { adStarted: started, adFinished: () => done(true), adError: () => done(false) })
    },
    celebrate: () => sdk.game.happytime(),
  }
}

/** До запуска игры: SDK площадки и облачное сохранение. Ошибка — тихо продолжаем без площадки. */
export async function initPlatform() {
  try {
    platform = window.YaGames ? await yandex() : window.CrazyGames?.SDK ? await crazy() : null
  } catch {
    platform = null
  }
  canReward.value = !!platform
}

/** Язык интерфейса площадки ('ru', 'tr', …) или null */
export const platformLang = () => platform?.lang() ?? null

const visible = ref(!document.hidden)
document.addEventListener('visibilitychange', () => (visible.value = !document.hidden))

/** Игра загружена и готова к действиям игрока; дальше площадка знает, идёт ли игра */
export function platformReady() {
  if (!platform) return
  platform.ready()
  let last = ''
  watchEffect(() => {
    const on = !platformPaused.value
    const key = `${on}${visible.value}`
    if (key === last) return
    last = key
    platform!.gameplay(on, visible.value)
  })
}

/** Сейв в облако площадки; force — уходим со страницы */
export const cloudSave = (json: string, force = false) => platform?.save(json, force)

/** Особый момент (финиш забега, рекорд) — CrazyGames просит отмечать такие, но редко */
export const celebrate = () => platform?.celebrate()

/** Реклама за награду. true — досмотрел, награду выдать. На время показа игра и звук на паузе. */
export function showRewarded(): Promise<boolean> {
  if (!platform) return Promise.resolve(false)
  return new Promise((resolve) => {
    platformPaused.value = true
    platform!.rewarded({
      started: () => (platformPaused.value = true),
      done: (ok) => {
        platformPaused.value = false
        resolve(ok)
      },
    })
  })
}
