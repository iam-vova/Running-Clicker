<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { BOOSTS, CHARACTERS, GENERATORS, OFFLINE, RACES, UPGRADES } from './game/config.ts'
import type { CharId } from './game/config.ts'
import {
  buyBoost, buyGen, buyUpgrade, canStartRace, catchGel, click, clickValue, fmt, fmtClock, forecast, genCost, genCostN, raceGap,
  genLevelRate, genRate, genUnlocked, kmPerSec, nextBoost, runSpeed, raceReady, raceLive, bestForecast, tapKm, feedDue, catchRaceGel,
  startRace, upgradeVisible, abandonRace, offlineHours, offlineEff,
} from './game/logic.ts'
import type { OfflineReport, RaceResult } from './game/logic.ts'
import { paused, resetGame, showToast, startGame, state, toast } from './game/state.ts'
import { lang, medalsWord, numLocale, setLang, t } from './i18n.ts'
import { musicOn, muted, setMuted, setMusic, setSound, sfx, soundOn, startMusic, unlock } from './sound.ts'
import type { Lang } from './i18n.ts'
import heRun from './assets/sprites/he/run.png'
import heIdle from './assets/sprites/he/idle.png'
import heFinish from './assets/sprites/he/finish.png'
import sheRun from './assets/sprites/she/run.png'
import sheIdle from './assets/sprites/she/idle.png'
import sheFinish from './assets/sprites/she/finish.png'
import stadiumBg from './assets/bg/stadium.png'
import stadiumNightBg from './assets/bg/stadium-night.png'
import routeBg from './assets/bg/route.png'
import routeNightBg from './assets/bg/route-night.png'
import gelImg from './assets/sprites/items/gel.png'
import archImg from './assets/sprites/items/finish-arch.png'

// Пиксельные иконки 32×32 (PixelLab): id = имя файла в assets/icons
const ICONS = import.meta.glob('./assets/icons/*.png', { eager: true, import: 'default' }) as Record<string, string>
const icon = (id: string) => ICONS[`./assets/icons/${id}.png`]

// --- масштаб пикселей: фон 384px высотой примерно на весь экран, только целые множители ---
const px = ref(2)
function fitScale() {
  px.value = Math.max(2, Math.min(4, Math.round((window.innerHeight - 64) / 400)))
}
onMounted(() => {
  fitScale()
  gelTimer = window.setInterval(gelTick, 1000)
  groundFrame = requestAnimationFrame(scrollGround)
  addEventListener('resize', fitScale)
  addEventListener('keydown', onKey)
  addEventListener('pointerdown', onFirstTouch, true) // звук и музыка включаются по касанию (iOS)
})
onBeforeUnmount(() => {
  clearInterval(gelTimer)
  cancelAnimationFrame(groundFrame)
  removeEventListener('resize', fitScale)
  removeEventListener('keydown', onKey)
  removeEventListener('pointerdown', onFirstTouch, true)
})
// --- прокрутка фона из JS: сдвиг на целые игровые пиксели, без анимированного слоя (на iOS он мигал) ---
const groundEl = ref<HTMLElement | null>(null)
const GROUND_SPEED = 64 // игровых пикселей в секунду: локация (512) за 8 с
/** Панорама маршрута: одна цельная картинка PixelLab (стадион → парк → город), зеркально замкнута (tools/bg/panorama_single.py) */
const ROUTE_W = 800
let groundFrame = 0
let groundX = 0
let groundTotal = 0 // пройдено фоном без зацикливания, игровые px — для объектов, стоящих на земле
let groundLast = 0
let stepT = 0
function moveGround(d: number) {
  groundX = (groundX + d) % ROUTE_W
  groundTotal += d
  if (groundEl.value) groundEl.value.style.backgroundPositionX = `${-Math.floor(groundX) * px.value}px`
}
function scrollGround(now: number) {
  const dt = groundLast ? Math.min((now - groundLast) / 1000, 0.1) : 0
  groundLast = now
  if (state.activeRace && feedDue(state)) spawnFeed()
  if (dashing.value || runout.value || state.activeRace) moveGround(GROUND_SPEED * dt)
  // шаги на трассе: два шага на цикл анимации бега (0.7 с)
  if (state.activeRace && !paused.value && !document.hidden) {
    stepT += dt
    if (stepT >= 0.35) {
      stepT -= 0.35
      sfx.step()
    }
  }
  placeArch()
  groundFrame = requestAnimationFrame(scrollGround)
}

// --- финишная арка стоит на земле: едет вместе с фоном и встречает бегуна ровно на финише ---
const archEl = ref<HTMLElement | null>(null)
const archOn = ref(false)
let archWorld = 0 // положение арки в координатах groundTotal
/** Сколько секунд бежать до финиша (секунда = минута на трассе) */
const timeLeft = () => (live.value && state.activeRace ? Math.max(0, live.value.finish - state.activeRace.elapsed) : 0)
function placeArch() {
  if (state.activeRace && live.value) {
    const target = groundTotal + timeLeft() * GROUND_SPEED
    if (!archOn.value && (target - groundTotal) * px.value < 280) {
      archOn.value = true
      archWorld = target
    } else if (archOn.value && Math.abs(target - archWorld) > 6) {
      archWorld += (target - archWorld) * 0.15 // плавная подстройка под изменившийся прогноз (стена, гель)
    }
  } else if (!celebrating.value && !runout.value) {
    archOn.value = false
  }
  if (archOn.value && archEl.value) archEl.value.style.setProperty('--ax', `${Math.round(archWorld - groundTotal) * px.value}px`)
}
// --- персонаж: листы кадров 64×64 в ряд ---
const SHEETS_BY_CHAR = {
  he: { run: heRun, idle: heIdle, finish: heFinish },
  she: { run: sheRun, idle: sheIdle, finish: sheFinish },
} as const
// Снаряжение на персонаже: прозрачные слои поверх листа кадров (tools/sprites/gear_layers.py) —
// кроссовки (уровни 1–4) и экипировка (1 шорты, 2 + пояс, 3 + жилет). Слои — фоны того же элемента, анимируются вместе.
const GEAR_LAYERS = import.meta.glob('./assets/sprites/*/*-*.png', { eager: true, import: 'default' }) as Record<string, string>
const layered = (id: CharId, anim: 'run' | 'idle' | 'finish') => {
  const urls: string[] = []
  const shoes = state.boosts.shoes
  const kit = state.boosts.gear
  if (shoes) urls.push(GEAR_LAYERS[`./assets/sprites/${id}/${anim}-shoes-${shoes}.png`])
  if (kit) urls.push(GEAR_LAYERS[`./assets/sprites/${id}/${anim}-kit-${kit}.png`])
  urls.push(SHEETS_BY_CHAR[id][anim])
  return urls.filter(Boolean).map((u) => `url(${u})`).join(', ')
}
const sheetVars = (id: CharId) => ({
  '--run-sheet': layered(id, 'run'),
  '--idle-sheet': layered(id, 'idle'),
  '--finish-sheet': layered(id, 'finish'),
})
const picking = ref(false) // экран выбора открыт вручную из «Профиля»
function pick(id: CharId) {
  state.character = id
  picking.value = false
  sheet.value = null
}
/** Празднует финиш пару секунд после успешного забега */
const celebrating = ref(false)
/** Добегание после финиша: бегун ещё бежит, чтобы пересечь арку */
const runout = ref(false)
const FINISH_RUNOUT = 1300 // мс: бегун пробегает арку и отбегает от неё
const FINISH_CELEBRATE = 1600 // мс: два цикла анимации победы, потом окно результата
const heroPose = computed(() => (celebrating.value ? 'finish' : dashing.value || runout.value || state.activeRace ? 'run' : 'idle'))

const stageVars = computed(() => ({
  '--px': px.value,
  ...sheetVars(state.character ?? 'he'),
  '--stadium-day': `url(${stadiumBg})`,
  '--stadium-night': `url(${stadiumNightBg})`,
  '--route-day': `url(${routeBg})`,
  '--route-night': `url(${routeNightBg})`,
}))

// --- рывок: тап в любое место сцены ---
const dashing = ref(false)
let dashTimer = 0
type Pop = { id: number; x: number; y: number; text: string }
const pops = ref<Pop[]>([])
let popId = 0
function dash(e?: PointerEvent) {
  const inRace = live.value
  const text = inRace ? (inRace.canTap ? t('+{n} м', { n: Math.round(inRace.tapM) }) : t('нет сил')) : t('+{n} км', { n: fmt(clickValue(state)) })
  // рывок на трассе — бегун продвинулся: сдвигаем землю на столько же, чтобы арка и фон двигались вместе
  if (inRace && inRace.canTap) moveGround((inRace.tapM / 1000 / inRace.speed) * GROUND_SPEED)
  if (inRace && !inRace.canTap) sfx.noEnergy()
  else sfx.dash()
  click(state)
  dashing.value = true
  clearTimeout(dashTimer)
  dashTimer = window.setTimeout(() => (dashing.value = false), 500)
  const id = ++popId
  const x = e ? e.offsetX : 0
  const y = e ? e.offsetY : 0
  pops.value.push({ id, x, y, text })
  setTimeout(() => (pops.value = pops.value.filter((p) => p.id !== id)), 800)
}
// --- пролетающий гель: раз в 50–90 с активной игры, летит 6–10 с, пропуск без штрафа ---
type Gel = { id: number; top: number; dur: number; race?: boolean }
const gel = ref<Gel | null>(null)
let gelTimer = 0
let gelIn = rand(50, 90)
function rand(a: number, b: number) {
  return a + Math.random() * (b - a)
}
function gelTick() {
  if (document.hidden || gel.value || state.activeRace) return // только активное время вне забега, один гель за раз
  if (--gelIn > 0) return
  gel.value = { id: Date.now(), top: rand(0.28, 0.5), dur: rand(6, 10) }
  gelIn = rand(50, 90)
}
/** Пункт питания на трассе: гель летит быстрее, на длинных забегах — дольше */
function spawnFeed() {
  const a = activeRace.value
  const dur = a ? Math.min(6, Math.max(2.5, forecast(state, a.km) * 0.3)) : 4
  gel.value = { id: Date.now(), top: rand(...raceGelBand()), dur, race: true }
}
/** Свободная полоса сцены для геля на забеге: от низа плашки скорости до середины бегуна (доли высоты сцены) */
function raceGelBand(): [number, number] {
  const hero = document.querySelector('.hero:not(.ghost)')
  const stage = hero?.parentElement
  const hud = document.querySelector('.hud')
  if (!hero || !stage || !hud) return [0.5, 0.6]
  const s = stage.getBoundingClientRect()
  const h = hero.getBoundingClientRect()
  const gelH = 32 * px.value
  const lo = (hud.getBoundingClientRect().bottom - s.top + 24) / s.height // +24: гель подпрыгивает на 18 px
  const hi = (h.top + h.height * 0.5 - gelH - s.top) / s.height
  return hi > lo ? [lo, hi] : [lo, lo]
}
function grabGel(e: PointerEvent) {
  sfx.gel()
  const text = gel.value?.race ? t('+{n}% сил', { n: Math.round(catchRaceGel(state) * 100) }) : t('+{n} км', { n: fmt(catchGel(state)) })
  const id = ++popId
  const box = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const stage = (e.currentTarget as HTMLElement).parentElement!.getBoundingClientRect()
  pops.value.push({ id, x: box.left - stage.left + box.width / 2, y: box.top - stage.top, text })
  setTimeout(() => (pops.value = pops.value.filter((p) => p.id !== id)), 800)
  gel.value = null
}

function onKey(e: KeyboardEvent) {
  if (e.code === 'Space' && !sheet.value) {
    e.preventDefault()
    dash()
  }
}


/** Итог последней попытки — экран результата и строка в окне «Забег» */
type Result = {
  id: (typeof RACES)[number]['id']
  name: string
  km: number
  ok: boolean
  covered: number
  time: number
  cutoff: number
  reward: string
  unlocked: string | null // какая тренировка открылась
  next: string | null // следующая дистанция
  gap: ReturnType<typeof raceGap> | null // чего не хватило (для схода)
  gaveUp: boolean // сошёл сам, а не обогнала тень
}
const lastResult = ref<Result | null>(null)
/** Награда целиком: множитель + тренировка, которую открывает забег */
const rewardText = (r: (typeof RACES)[number]) => {
  const g = GENERATORS.find((g) => g.unlockRace === r.id)
  return g ? t('{reward} и тренировка «{name}»', { reward: t(r.reward), name: t(g.name) }) : t(r.reward)
}
const showResult = ref(false)
// --- возвращение: сколько натренировал бегун, пока игра была закрыта ---
const away = ref<OfflineReport | null>(null)
function onRaceFinish(res: RaceResult) {
  if (res.ok) sfx.finish()
  else sfx.dnf()
  const r = RACES.find((r) => r.id === res.id)!
  lastResult.value = {
    id: r.id,
    name: r.name,
    km: r.km,
    ok: res.ok,
    covered: res.covered,
    time: res.time,
    cutoff: r.cutoff,
    reward: r.reward,
    unlocked: GENERATORS.find((g) => g.unlockRace === r.id)?.name ?? null,
    next: RACES.find((x) => !state.races.includes(x.id))?.name ?? null,
    gap: res.ok ? null : raceGap(state, r.id),
    gaveUp: !!res.gaveUp,
  }
  sheet.value = null
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
    sheet.value = null
    showResult.value = true
  }, FINISH_RUNOUT + FINISH_CELEBRATE)
  setTimeout(() => (celebrating.value = false), FINISH_RUNOUT + FINISH_CELEBRATE + 1000)
}
startGame(onRaceFinish, (report) => {
  away.value = report
  paused.value = true // забег не идёт, пока игрок читает отчёт
})
function onFirstTouch() {
  unlock()
  startMusic()
}
/** Покупка прошла — «монетка» */
function bought(ok: boolean) {
  if (ok) sfx.buy()
}
/** «Сдаться»: первый тап просит подтверждения, второй — сход */
const confirmQuit = ref(false)
function quitRace() {
  const res = abandonRace(state)
  confirmQuit.value = false
  if (res) onRaceFinish(res)
}
function closeAway() {
  away.value = null
  paused.value = false
}

// --- пакетная прокачка тренировок: ×1 / ×10 / ×100, выбор запоминается в этом браузере ---
const BULK = [1, 10, 100] as const
const bulk = ref<number>(1)
try {
  const saved = Number(localStorage.getItem('ultramarathon-bulk'))
  if (BULK.includes(saved as never)) bulk.value = saved
} catch {
  /* хранилище недоступно */
}
function setBulk(n: number) {
  bulk.value = n
  try {
    localStorage.setItem('ultramarathon-bulk', String(n))
  } catch {
    /* хранилище недоступно */
  }
}

const pct = (x: number) => Math.round(x * 100) + '%'
/** Часы с минутами: 4.5 → «4 ч 30 мин» */
const fmtHours = (h: number) => {
  const m = Math.round((h % 1) * 60)
  return t('{h} ч', { h: Math.floor(h) }) + (m ? ' ' + t('{m} мин', { m }) : '')
}
/** Эффект тренировки на офлайн — строка под тренировкой */
const offlineEffect = (id: string) =>
  id === 'club'
    ? t('офлайн до {h}', { h: fmtHours(offlineHours(state)) }) + (offlineHours(state) < OFFLINE.maxHours ? '' : t(' (макс.)'))
    : id === 'coach'
      ? t('офлайн {p} дохода', { p: pct(offlineEff(state)) }) + (offlineEff(state) < OFFLINE.maxEff ? '' : t(' (макс.)'))
      : null
function retry() {
  showResult.value = false
  if (lastResult.value && canStartRace(state, lastResult.value.id) && startRace(state, lastResult.value.id)) sfx.start()
}
function goTrain() {
  showResult.value = false
  sheet.value = 'gear'
}

/** Сколько км прибавляется за секунду (доход) */
const perSec = computed(() => kmPerSec(state))
/** Скорость бегуна на 1 км, км/ч — растёт от тренировок */
const speedNow = computed(() => runSpeed(state))
const nextRace = computed(() => RACES.find((r) => !state.races.includes(r.id)) ?? null)
const activeRace = computed(() => (state.activeRace ? RACES.find((r) => r.id === state.activeRace!.id)! : null))
/** Прогноз финиша следующего забега, минуты */
const eta = computed(() => (nextRace.value ? forecast(state, nextRace.value.km) : 0))
/** Средняя скорость на дистанции по прогнозу, км/ч */
const raceSpeed = computed(() => (nextRace.value ? (nextRace.value.km / eta.value) * 60 : 0))
const gap = computed(() => (nextRace.value ? eta.value - nextRace.value.cutoff : 0))
/** Лучший финиш, если тратить все лишние силы и гели на рывки */
const etaBest = computed(() => (nextRace.value ? bestForecast(state, nextRace.value.id) : 0))
/** ok — успеваешь ровным бегом; maybe — только с рывками и гелями; late — не успеть */
const readiness = computed(() =>
  !nextRace.value || gap.value <= 0 ? 'ok' : etaBest.value <= nextRace.value.cutoff ? 'maybe' : 'late',
)
const raceProgress = computed(() => (nextRace.value ? Math.min(nextRace.value.cutoff / eta.value, 1) : 1))
const raceStatus = (id: string) =>
  state.races.includes(id as never) ? 'done' : nextRace.value?.id === id ? 'next' : 'locked'

// --- на трассе ---
const live = computed(() => {
  const a = state.activeRace
  if (!a || !activeRace.value) return null
  const r = activeRace.value
  const l = raceLive(state)!
  const runner = a.covered / r.km
  const broom = Math.min(a.elapsed / r.cutoff, 1)
  return {
    ...l,
    runner,
    broom,
    leadM: (runner - broom) * r.km * 1000, // отрыв от тени лимита, м (минус — тень впереди)
    // тень на сцене: сдвиг от бегуна по доле дистанции, в пределах экрана
    ghostX: -Math.max(-170, Math.min(170, (runner - broom) * 1500)),
    tapM: tapKm(state, r.id) * 1000,
  }
})
/** Удар о «стену», когда силы кончились */
watch(
  () => live.value?.wall,
  (w, was) => {
    if (w && !was) sfx.wall()
  },
)
const xMult = (m: number) => '×' + (Math.round(m * 100) / 100).toLocaleString(numLocale())
const num = (v: number) => v.toLocaleString(numLocale())
/** Длительность отсутствия: «6 ч 24 мин» / «6 h 24 min» */
const fmtAway = (sec: number) =>
  sec < 3600
    ? t('{m} мин', { m: Math.floor(sec / 60) })
    : t('{h} ч', { h: Math.floor(sec / 3600) }) + ' ' + t('{m} мин', { m: Math.floor((sec % 3600) / 60) })
/** Темп «6:12 /км» */
const paceText = (kmh: number) => fmtClock(60 / kmh) + ' ' + t('/км')
const currentLevel = (b: (typeof BOOSTS)[number]) => {
  const lvl = state.boosts[b.id]
  return lvl ? { ...b.levels[lvl - 1], start: false } : { name: b.start as string, icon: b.levels[0].icon, start: true }
}
const STAT_NAME = { speed: 'скорость', stamina: 'выносливость', click: 'рывок' } as const
const nextDesc = (b: (typeof BOOSTS)[number]) => {
  const n = nextBoost(state, b.id)!
  return 'pct' in n && n.pct ? t('{m} и +{p}% секундного дохода', { m: xMult(n.mult), p: n.pct * 100 }) : xMult(n.mult)
}
/** Техника бега — в «Тренировках», остальные ветки — в «Снаряжении» */
const TRAIN_BOOSTS = BOOSTS.filter((b) => b.id === 'technique')
const GEAR_BOOSTS = BOOSTS.filter((b) => b.id !== 'technique')
const visibleUpgrades = computed(() => UPGRADES.filter((u) => upgradeVisible(state, u.id)))
/** Состояние гаджета в «Снаряжении»: закрыт (мало уровней тренировки) / можно купить / куплен */
const upgradeState = (u: (typeof UPGRADES)[number]) =>
  state.upgrades.includes(u.id) ? 'owned' : state.owned[u.gen] >= u.need ? 'open' : 'locked'
const genName = (id: string) => GENERATORS.find((g) => g.id === id)?.name ?? id
const lockedRaceName = (id: string) => t(RACES.find((r) => r.id === id)?.name ?? id)

// --- окна снизу ---
type Sheet = 'train' | 'gear' | 'race' | 'more' | 'settings'
const SHEETS: { id: Sheet; icon: string; label: string }[] = [
  { id: 'train', icon: 'stopwatch', label: 'Тренировки' },
  { id: 'gear', icon: 'sneaker', label: 'Снаряжение' },
  { id: 'race', icon: 'flag', label: 'Забег' },
  { id: 'more', icon: 'medal', label: 'Профиль' },
]
const sheet = ref<Sheet | null>(null)
const sheetTitle = computed(() => t(sheet.value === 'settings' ? 'Настройки' : (SHEETS.find((s) => s.id === sheet.value)?.label ?? '')))
function openSheet(id: Sheet) {
  sheet.value = sheet.value === id ? null : id
}
/** Сколько покупок доступно прямо сейчас — бейдж на кнопке */
const affordTrain = computed(
  () => GENERATORS.filter((g) => genUnlocked(state, g.id) && state.km >= genCost(g.id, state.owned[g.id])).length +
    TRAIN_BOOSTS.filter((b) => (nextBoost(state, b.id)?.cost ?? Infinity) <= state.km).length,
)
const affordGear = computed(
  () => GEAR_BOOSTS.filter((b) => (nextBoost(state, b.id)?.cost ?? Infinity) <= state.km).length +
    visibleUpgrades.value.filter((u) => state.km >= u.cost).length,
)
const raceBadge = computed(() => (state.activeRace ? '●' : nextRace.value && raceReady(state, nextRace.value.id) ? '!' : ''))
function badge(id: Sheet) {
  if (id === 'train') return affordTrain.value || ''
  if (id === 'gear') return affordGear.value || ''
  if (id === 'race') return raceBadge.value
  return ''
}
function go() {
  if (!nextRace.value) return
  if (startRace(state, nextRace.value.id)) sfx.start()
  sheet.value = null
}

// --- тема: авто (как у Claude/системы) → день → ночь ---
type ThemePref = 'auto' | 'light' | 'dark'
const THEME_KEY = 'ultramarathon-theme'
const THEMES = [
  { id: 'auto', label: 'Авто' },
  { id: 'light', label: 'День' },
  { id: 'dark', label: 'Ночь' },
] as const
const LANGS: { id: Lang; label: string }[] = [
  { id: 'ru', label: 'RU' },
  { id: 'en', label: 'EN' },
]
const root = document.documentElement
const hostTheme = root.dataset.theme // тема, которую выставил просмотрщик, если выставил
const themePref = ref<ThemePref>('auto')
try {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'light' || saved === 'dark') themePref.value = saved
} catch {
  /* хранилище недоступно — остаётся авто */
}
function applyTheme() {
  const t = themePref.value === 'auto' ? hostTheme : themePref.value
  if (t) root.dataset.theme = t
  else delete root.dataset.theme
}
function setTheme(v: ThemePref) {
  themePref.value = v
  applyTheme()
  try {
    localStorage.setItem(THEME_KEY, themePref.value)
  } catch {
    /* не запомним — не страшно */
  }
}
applyTheme()

const confirmReset = ref(false)
function doReset() {
  resetGame()
  confirmReset.value = false
  sheet.value = null
  showToast(t('Начинаем с нуля'))
}
</script>

<template>
  <main class="app" :style="stageVars">
    <!-- Сцена на весь экран: тап в любое место — рывок -->
    <div class="stage" :class="{ moving: dashing || state.activeRace }" @pointerdown="dash">
      <div ref="groundEl" class="ground" aria-hidden="true"></div>
      <!-- Финишная арка: выезжает справа на последних 6% дистанции, бегун пробегает под ней и празднует рядом -->
      <img v-show="archOn" ref="archEl" class="finish-arch" :src="archImg" alt="" />
      <!-- Тень лимита: силуэт бегуна в темп контрольного времени — позади, если успеваешь, впереди, если отстаёшь -->
      <template v-if="state.activeRace && live && activeRace">
        <span class="sprite run hero ghost" :style="{ '--gx': live.ghostX + 'px' }" aria-hidden="true"></span>
        <span class="ghost-tag" :style="{ '--gx': live.ghostX + 'px' }">{{ t('лимит {t}', { t: fmtClock(activeRace.cutoff) }) }}</span>
      </template>
      <span class="sprite hero" :class="heroPose" aria-hidden="true"></span>
      <button
        v-if="gel"
        :key="gel.id"
        class="gel"
        :style="{ top: gel.top * 100 + '%', animationDuration: gel.dur + 's', backgroundImage: `url(${gelImg})` }"
        :aria-label="t('Поймать гель')"
        @pointerdown.stop="grabGel"
        @animationend="gel = null"
      ></button>
      <span v-for="p in pops" :key="p.id" class="pop" :style="{ left: p.x + 'px', top: p.y + 'px' }">{{ p.text }}</span>
      <p v-if="state.clicks < 5 && !state.activeRace && !runout && !celebrating" class="hint-tap">{{ t('Нажимай на экран, чтобы бежать') }}</p>
    </div>

    <!-- HUD поверх сцены -->
    <header class="hud" aria-live="polite">
      <!-- Ресурс: тратится на тренировки и снаряжение -->
      <div class="label">{{ t('Тренировочные км') }}</div>
      <!-- Настройки: шестерёнка в правом верхнем углу -->
      <!-- Быстрое «без звука» в левом верхнем углу: глушит всё; раздельно звук и музыка — в настройках -->
      <button class="corner-btn mute-btn" :aria-label="t('Без звука')" :aria-pressed="muted" @click="setMuted(!muted)">
        <img :src="icon(muted ? 'sound-off' : 'sound-on')" alt="" />
      </button>
      <button class="gear-btn" :aria-label="t('Настройки')" @click="openSheet('settings')"><img :src="icon('gear')" alt="" /></button>
      <div class="km">{{ fmt(state.km) }}</div>
      <div class="hud-line"><b class="accent">+{{ fmt(perSec) }}</b> {{ t('в секунду') }}</div>
      <!-- Статистика: не тратится -->
      <div class="hud-line muted-line">{{ t('Общий пробег {km} км', { km: fmt(state.totalKm) }) }}</div>

      <!-- Следующий забег: прогноз против лимита -->
      <button v-if="!state.activeRace && nextRace" class="next-race" @click="openSheet('race')">
        <span class="race-row">
          <b>{{ t('Забег {name}', { name: t(nextRace.name) }) }}</b>
          <span class="muted">{{ t('лимит {t}', { t: fmtClock(nextRace.cutoff) }) }}</span>
        </span>
        <span class="race-row">
          <span>{{ t('Прогноз финиша') }} <b :class="readiness">{{ fmtClock(eta) }}</b></span>
          <b :class="readiness">{{ readiness === 'ok' ? t('Готов к старту ✓') : readiness === 'maybe' ? t('Успеешь с рывками') : t('Готовность {p}%', { p: Math.floor(raceProgress * 100) }) }}</b>
        </span>
        <span class="ready" role="progressbar" :aria-valuenow="Math.round(raceProgress * 100)" aria-valuemin="0" aria-valuemax="100" :aria-label="t('Готовность к забегу')">
          <i :class="readiness" :style="{ width: raceProgress * 100 + '%' }"></i>
        </span>
      </button>

      <div v-if="state.activeRace && activeRace && live" class="race-hud">
        <div class="race-row">
          <b>{{ t('На трассе: {name}', { name: t(activeRace.name) }) }}</b>
          <span class="timer"><img class="ico-inline" :src="icon('stopwatch')" alt="" />{{ fmtClock(state.activeRace.elapsed) }}</span>
        </div>
        <div class="race-row">
          <span>{{ t('Прогноз финиша') }} <b :class="live.finish > activeRace.cutoff ? 'late' : 'ok'">{{ fmtClock(live.finish) }}</b></span>
          <span class="muted">{{ t('лимит {t}', { t: fmtClock(activeRace.cutoff) }) }}</span>
        </div>
        <div class="mini distance" :aria-label="t('Пройденная дистанция')" role="progressbar" :aria-valuenow="Math.round(live.runner * 100)" aria-valuemin="0" aria-valuemax="100">
          <i class="mini-fill" :class="{ ok: live.leadM >= 0 }" :style="{ width: live.runner * 100 + '%' }"></i>
          <span class="mini-ghost sprite run" :style="{ left: live.broom * 100 + '%' }" aria-hidden="true"></span>
          <span class="mini-dot" :style="{ left: live.runner * 100 + '%' }"></span>
        </div>
        <div class="race-row">
          <span>{{ t('{c} из {k} км', { c: state.activeRace.covered.toFixed(2), k: activeRace.km }) }}</span>
          <b :class="live.leadM >= 0 ? 'ok' : 'late'">
            {{ live.leadM >= 0 ? t('отрыв от тени +{m} м', { m: Math.round(live.leadM) }) : t('тень впереди на {m} м', { m: Math.round(-live.leadM) }) }}
          </b>
        </div>
        <!-- Запас сил: рывки тратят, гели на пунктах питания возвращают; отметка — сколько нужно до финиша ровным бегом -->
        <div class="race-row">
          <span>{{ t('Силы') }} <b :class="live.wall ? 'late' : live.energy >= live.need ? 'ok' : 'maybe'">{{ Math.round(live.energy * 100) }}%</b></span>
          <span class="muted">{{ live.wall ? t('Стена! Лови гель') : live.energy >= live.need ? t('хватит до финиша') : t('не хватит до финиша') }}</span>
        </div>
        <div class="energy" role="progressbar" :aria-label="t('Запас сил')" :aria-valuenow="Math.round(live.energy * 100)" aria-valuemin="0" aria-valuemax="100">
          <i :class="live.energy >= live.need ? 'ok' : 'late'" :style="{ width: live.energy * 100 + '%' }"></i>
          <span class="need" :style="{ left: Math.min(live.need, 1) * 100 + '%' }"></span>
        </div>
        <div class="quit-row">
          <button v-if="!confirmQuit" class="quit" @click="confirmQuit = true">{{ t('Сдаться') }}</button>
          <template v-else>
            <span class="muted">{{ t('Сойти с дистанции?') }}</span>
            <button class="quit danger" @click="quitRace">{{ t('Да, сойти') }}</button>
            <button class="quit" @click="confirmQuit = false">{{ t('Бежать дальше') }}</button>
          </template>
        </div>
      </div>

      <!-- Скорость бегуна — закреплена под карточкой забега, не зависит от персонажа -->
      <span class="plate">{{ t('{v} км/ч', { v: speedNow.toFixed(1) }) }}</span>
    </header>

    <!-- Нижняя панель -->
    <nav class="tabs">
      <button v-for="s in SHEETS" :key="s.id" class="tab" :class="{ on: sheet === s.id }" @click="openSheet(s.id)">
        <img class="ico" :class="{ outlined: s.icon === 'flag' }" :src="icon(s.icon)" alt="" />
        <span>{{ t(s.label) }}</span>
        <i v-if="badge(s.id) === '●'" class="live-dot" :aria-label="t('Забег идёт')"></i>
        <i v-else-if="badge(s.id)" class="badge">{{ badge(s.id) }}</i>
      </button>
    </nav>

    <!-- Окна -->
    <div v-if="sheet" class="backdrop" @click="sheet = null"></div>
    <section v-if="sheet" class="sheet" role="dialog" :aria-label="sheetTitle">
      <header class="sheet-head">
        <h2>{{ sheetTitle }}</h2>
        <button class="close" :aria-label="t('Закрыть')" @click="sheet = null">✕</button>
      </header>

      <div class="sheet-body">
        <!-- Тренировки -->
        <template v-if="sheet === 'train'">
          <div class="seg" role="radiogroup" :aria-label="t('Сколько уровней покупать')">
            <span class="muted small">{{ t('Покупать по') }}</span>
            <button v-for="n in BULK" :key="n" class="seg-btn" :class="{ on: bulk === n }" role="radio" :aria-checked="bulk === n" @click="setBulk(n)">×{{ n }}</button>
          </div>
          <ul class="list">
            <li v-for="g in GENERATORS" :key="g.id" class="item" :class="{ locked: !genUnlocked(state, g.id) }">
              <img class="ico" :src="icon(g.icon)" alt="" />
              <div class="info">
                <div class="name">{{ t(g.name) }} <span class="count">{{ t('ур. {n}', { n: state.owned[g.id] }) }}</span></div>
                <div class="meta" v-if="genUnlocked(state, g.id)">
                  <div>{{ t('+{v} км/с за уровень', { v: fmt(genLevelRate(state, g.id) / 60) }) }}</div>
                  <div>{{ t('всего {v} км/с · ×2 на ур. {n}', { v: fmt(genRate(state, g.id) / 60), n: (Math.floor(state.owned[g.id] / 25) + 1) * 25 }) }}</div>
                  <div v-if="offlineEffect(g.id)" class="offline-fx">{{ offlineEffect(g.id) }}</div>
                </div>
                <div class="meta" v-else>{{ t('Откроется после забега {name}', { name: lockedRaceName(g.unlockRace!) }) }}</div>
              </div>
              <button
                v-if="genUnlocked(state, g.id)"
                class="buy"
                :disabled="state.km < genCostN(g.id, state.owned[g.id], bulk)"
                @click="bought(buyGen(state, g.id, bulk))"
              >
                {{ t('{v} км', { v: fmt(genCostN(g.id, state.owned[g.id], bulk)) }) }}
              </button>
            </li>
          </ul>
          <!-- Техника бега — навык, а не вещь: живёт в «Тренировках» -->
          <ul class="list">
          <li v-for="b in TRAIN_BOOSTS" :key="b.id" class="item boost-row">
            <img class="ico" :class="{ start: currentLevel(b).start }" :src="icon(currentLevel(b).icon)" alt="" />
            <div class="info">
              <div class="name">
                {{ t(b.name) }}
                <span class="chip" :class="b.stat">{{ t(STAT_NAME[b.stat]) }} {{ xMult(b.levels[state.boosts[b.id] - 1]?.mult ?? 1) }}</span>
              </div>
              <div class="now-name">{{ t(currentLevel(b).name) }}</div>
              <div class="pips" :aria-label="t('Уровень {a} из {b}', { a: state.boosts[b.id], b: b.levels.length })">
                <i v-for="(_, i) in b.levels" :key="i" :class="{ on: i < state.boosts[b.id] }"></i>
              </div>
              <div class="meta">
                {{ nextBoost(state, b.id) ? t('Дальше: {name}, {desc}', { name: t(nextBoost(state, b.id)!.name), desc: nextDesc(b) }) : t('Максимальный уровень') }}
              </div>
            </div>
            <button v-if="nextBoost(state, b.id)" class="buy" :disabled="state.km < nextBoost(state, b.id)!.cost" @click="bought(buyBoost(state, b.id))">
              {{ t('{v} км', { v: fmt(nextBoost(state, b.id)!.cost) }) }}
            </button>
          </li>
          </ul>
        </template>

        <!-- Снаряжение -->
        <ul v-else-if="sheet === 'gear'" class="list">
          <!-- Одна строка на ветку, как в «Тренировках»: иконка · название, уровень, следующий шаг · цена -->
          <li v-for="b in GEAR_BOOSTS" :key="b.id" class="item boost-row">
            <img class="ico" :class="{ start: currentLevel(b).start }" :src="icon(currentLevel(b).icon)" alt="" />
            <div class="info">
              <div class="name">
                {{ t(b.name) }}
                <span class="chip" :class="b.stat">{{ t(STAT_NAME[b.stat]) }} {{ xMult(b.levels[state.boosts[b.id] - 1]?.mult ?? 1) }}</span>
              </div>
              <div class="now-name">{{ t(currentLevel(b).name) }}</div>
              <div class="pips" :aria-label="t('Уровень {a} из {b}', { a: state.boosts[b.id], b: b.levels.length })">
                <i v-for="(_, i) in b.levels" :key="i" :class="{ on: i < state.boosts[b.id] }"></i>
              </div>
              <div class="meta">
                {{ nextBoost(state, b.id) ? t('Дальше: {name}, {desc}', { name: t(nextBoost(state, b.id)!.name), desc: nextDesc(b) }) : t('Максимальный уровень') }}
              </div>
            </div>
            <button v-if="nextBoost(state, b.id)" class="buy" :disabled="state.km < nextBoost(state, b.id)!.cost" @click="bought(buyBoost(state, b.id))">
              {{ t('{v} км', { v: fmt(nextBoost(state, b.id)!.cost) }) }}
            </button>
          </li>
          <!-- Гаджеты (пульсометр): строка видна всегда — закрыт / можно купить / куплено -->
          <li v-for="u in UPGRADES" :key="u.id" class="item" :class="{ locked: upgradeState(u) === 'locked' }">
            <img class="ico" :src="icon(u.icon)" alt="" />
            <div class="info">
              <div class="name">{{ t(u.name) }}</div>
              <div class="meta">{{ t(u.desc) }}</div>
              <div v-if="upgradeState(u) === 'locked'" class="meta">{{ t('Откроется на ур. {n} «{gen}»', { n: u.need, gen: t(genName(u.gen)) }) }}</div>
              <div v-else-if="upgradeState(u) === 'owned'" class="meta owned">{{ t('Куплено ✓') }}</div>
            </div>
            <button v-if="upgradeState(u) !== 'owned'" class="buy" :disabled="upgradeState(u) === 'locked' || state.km < u.cost" @click="bought(buyUpgrade(state, u.id))">
              {{ t('{v} км', { v: fmt(u.cost) }) }}
            </button>
          </li>
        </ul>

        <!-- Забег -->
        <template v-else-if="sheet === 'race'">
          <template v-if="state.activeRace && activeRace && live">
            <p class="lead">{{ t('Ты на трассе {name}. Закрой окно: тапы — рывки за счёт сил, гели на пунктах питания возвращают силы.', { name: t(activeRace.name) }) }}</p>
            <button class="primary" @click="sheet = null">{{ t('К трассе') }}</button>
          </template>
          <template v-else-if="nextRace">
            <h3 class="race-name">{{ t('Забег {name}', { name: t(nextRace.name) }) }}</h3>
            <dl class="splits">
              <div>
                <dt>{{ t('Прогноз финиша') }}</dt>
                <dd :class="readiness">{{ fmtClock(eta) }}</dd>
              </div>
              <div>
                <dt>{{ t('Лимит') }}</dt>
                <dd>{{ fmtClock(nextRace.cutoff) }}</dd>
              </div>
              <div>
                <dt>{{ t('Темп') }}</dt>
                <dd>{{ paceText(raceSpeed) }}</dd>
              </div>
            </dl>
            <div class="race-row small">
              <span class="muted">{{ t('Готовность к забегу') }}</span>
              <b :class="readiness">{{ gap > 0 ? `${Math.floor(raceProgress * 100)}%` : t('Готов ✓') }}</b>
            </div>
            <div class="ready" role="progressbar" :aria-valuenow="Math.round(raceProgress * 100)" aria-valuemin="0" aria-valuemax="100">
              <i :class="readiness" :style="{ width: raceProgress * 100 + '%' }"></i>
            </div>
            <p v-if="lastResult" class="last" :class="lastResult.ok ? 'ok' : 'late'">
              {{ lastResult.ok ? t('Прошлая попытка: финиш {name} за {t}', { name: t(lastResult.name), t: fmtClock(lastResult.time) }) : t('Прошлая попытка: сход на {d} км', { d: lastResult.covered.toFixed(1) }) }}
            </p>
            <p class="verdict" :class="gap > 0 ? 'late' : 'ok'">
              {{ gap > 0 ? t('Не успеваешь на {t}', { t: fmtClock(gap) }) : t('Успеваешь с запасом {t}', { t: fmtClock(-gap) }) }}
            </p>
            <p class="muted" :class="{ maybe: readiness === 'maybe' }">
              {{ t('С рывками и гелями — до {t}.', { t: fmtClock(etaBest) }) }}
              {{ readiness === 'ok' ? t('Хороший шанс на личный рекорд.') : readiness === 'maybe' ? t('Успеешь, если правильно расходовать силы.') : t('Пока не хватит даже с ними.') }}
            </p>
            <p class="muted">{{ t('Награда: {r}', { r: rewardText(nextRace) }) }}</p>
            <button class="primary" :class="{ risky: !raceReady(state, nextRace.id) }" :disabled="!canStartRace(state, nextRace.id)" @click="go">
              {{ raceReady(state, nextRace.id) ? t('Старт') : t('Старт — рискнуть') }}
            </button>
          </template>
          <template v-else>
            <h3 class="race-name">{{ t('Все забеги пройдены') }}</h3>
            <p class="muted">{{ t('Следующий старт — 30 км и марафон. Появятся в следующей версии.') }}</p>
          </template>
          <h3 class="section">{{ t('Дистанции') }}</h3>
          <ul class="races">
            <li v-for="r in RACES" :key="r.id" :class="raceStatus(r.id)">
              <img class="mark" :src="icon(raceStatus(r.id) === 'done' ? 'check' : raceStatus(r.id) === 'next' ? 'next' : 'lock')" alt="" />
              <span class="rname">{{ t(r.name) }}</span>
              <span class="rcut">{{ t('лимит {t}', { t: fmtClock(r.cutoff) }) }}</span>
            </li>
          </ul>
        </template>

        <!-- Профиль: медали, рекорды, настройки -->
        <template v-else-if="sheet === 'more'">
          <div class="medal-sum">
            <img class="ico x2" :src="icon('medal')" alt="" />
            <div>
              <b class="medal-count">{{ state.medals }}</b>
              <span class="muted">{{ t('{w} за финиши', { w: medalsWord(state.medals) }) }}</span>
            </div>
          </div>
          <ul class="medals">
            <li v-for="r in RACES" :key="r.id" :class="{ got: state.races.includes(r.id) }">
              <img class="ico" :src="icon(`medal-${r.id}`)" alt="" />
              <span class="m-name">{{ t(r.name) }}</span>
              <span class="m-time">{{ state.bestTimes[r.id] ? fmtClock(state.bestTimes[r.id]!) : state.races.includes(r.id) ? t('финиш') : '—' }}</span>
            </li>
          </ul>
          <div class="setting">
            <span>{{ t('Общий пробег') }}</span>
            <b>{{ t('{v} км', { v: fmt(state.totalKm) }) }}</b>
          </div>
          <p class="muted small">{{ t('Секунда в игре — минута на трассе. Тренировки набегают километры, а скорость бегуна растёт вместе с ними.') }}</p>
          <p class="muted small">{{ t('Прогресс сохраняется в этом браузере. Пока игра закрыта, бегун тренируется до {h} с эффективностью {p}, а забег стоит на паузе.', { h: fmtHours(offlineHours(state)), p: pct(offlineEff(state)) }) }}</p>
          <div class="setting">
            <template v-if="!confirmReset">
              <button class="link" @click="confirmReset = true">{{ t('Сбросить прогресс') }}</button>
            </template>
            <span v-else>
              {{ t('Стереть всё?') }}
              <button class="link danger" @click="doReset">{{ t('Да, сбросить') }}</button>
              <button class="link" @click="confirmReset = false">{{ t('Отмена') }}</button>
            </span>
          </div>
        </template>

        <!-- Настройки: подпись слева, переключатель справа -->
        <template v-else-if="sheet === 'settings'">
          <div class="setting">
            <span>{{ t('Персонаж') }}</span>
            <div class="toggle" role="radiogroup" :aria-label="t('Персонаж')">
              <button v-for="c in CHARACTERS" :key="c.id" class="toggle-btn char" :class="{ on: state.character === c.id }" role="radio" :aria-checked="state.character === c.id" :aria-label="t(c.name)" :style="sheetVars(c.id)" @click="state.character = c.id">
                <span class="sprite idle tiny" aria-hidden="true"></span>
              </button>
            </div>
          </div>
          <div class="setting">
            <span>{{ t('Тема') }}</span>
            <div class="toggle" role="radiogroup" :aria-label="t('Тема')">
              <button v-for="th in THEMES" :key="th.id" class="toggle-btn" :class="{ on: themePref === th.id }" role="radio" :aria-checked="themePref === th.id" @click="setTheme(th.id)">{{ t(th.label) }}</button>
            </div>
          </div>
          <div class="setting">
            <span>{{ t('Звук') }}</span>
            <div class="toggle" role="radiogroup" :aria-label="t('Звук')">
              <button class="toggle-btn" :class="{ on: soundOn }" role="radio" :aria-checked="soundOn" @click="setSound(true)">{{ t('Вкл') }}</button>
              <button class="toggle-btn" :class="{ on: !soundOn }" role="radio" :aria-checked="!soundOn" @click="setSound(false)">{{ t('Выкл') }}</button>
            </div>
          </div>
          <div class="setting">
            <span>{{ t('Музыка') }}</span>
            <div class="toggle" role="radiogroup" :aria-label="t('Музыка')">
              <button class="toggle-btn" :class="{ on: musicOn }" role="radio" :aria-checked="musicOn" @click="setMusic(true)">{{ t('Вкл') }}</button>
              <button class="toggle-btn" :class="{ on: !musicOn }" role="radio" :aria-checked="!musicOn" @click="setMusic(false)">{{ t('Выкл') }}</button>
            </div>
          </div>
          <div class="setting">
            <span>{{ t('Язык') }}</span>
            <div class="toggle" role="radiogroup" :aria-label="t('Язык')">
              <button v-for="l in LANGS" :key="l.id" class="toggle-btn" :class="{ on: lang === l.id }" role="radio" :aria-checked="lang === l.id" @click="setLang(l.id)">{{ l.label }}</button>
            </div>
          </div>
        </template>
      </div>
    </section>

    <div v-if="toast" class="toast" role="status">{{ toast }}</div>

    <!-- Возвращение после офлайна -->
    <section v-if="away && !showResult" class="result" role="dialog" :aria-label="t('Пока тебя не было')">
      <div class="result-card">
        <img class="ico x2" :src="icon('jog')" alt="" />
        <div>
          <h2>{{ t('Пока тебя не было') }}</h2>
          <p class="muted">{{ t('Бегун продолжал тренироваться') }}</p>
        </div>
        <dl class="splits two">
          <div>
            <dt>{{ t('Время отсутствия') }}</dt>
            <dd>{{ fmtAway(away.away) }}</dd>
          </div>
          <div>
            <dt>{{ t('Тренировочные км') }}</dt>
            <dd class="ok">+{{ fmt(away.km) }}</dd>
          </div>
        </dl>
        <p class="muted small">
          <template v-if="away.counted < away.away">{{ t('Засчитано {h} — это лимит (растёт с «Беговым клубом»). ', { h: fmtHours(away.hours) }) }}</template>
          {{ t('Офлайн тренировки идут на {p} от темпа в игре (растёт с «Личным тренером»).', { p: pct(away.eff) }) }}
          <template v-if="away.racePaused"><br />{{ t('Забег стоял на паузе — продолжишь с того же места.') }}</template>
        </p>
        <button class="primary" @click="closeAway">{{ t('Продолжить') }}</button>
      </div>
    </section>

    <!-- Результат забега: финиш с наградой или сход с разбором -->
    <section v-if="showResult && lastResult" class="result" role="dialog" :aria-label="t('Результат забега')">
      <div class="result-card" :class="lastResult.ok ? 'win' : 'dnf'">
        <template v-if="lastResult.ok">
          <img class="ico x2" :src="icon(`medal-${lastResult.id}`)" alt="" />
          <h2>{{ t('Финиш! {name}', { name: t(lastResult.name) }) }}</h2>
          <dl class="splits two">
            <div>
              <dt>{{ t('Время') }}</dt>
              <dd class="ok">{{ fmtClock(lastResult.time) }}</dd>
            </div>
            <div>
              <dt>{{ t('Лимит') }}</dt>
              <dd>{{ fmtClock(lastResult.cutoff) }}</dd>
            </div>
          </dl>
          <ul class="rewards">
            <li><b>{{ t('+1 медаль') }}</b> {{ t('· всего {n}', { n: state.medals }) }}</li>
            <li><b>{{ t(lastResult.reward) }}</b></li>
            <li v-if="lastResult.unlocked">{{ t('Открыта тренировка:') }} <b>{{ t(lastResult.unlocked) }}</b></li>
            <li v-if="lastResult.next">{{ t('Следующий старт:') }} <b>{{ t(lastResult.next) }}</b></li>
            <li v-else>{{ t('Все дистанции пройдены — дальше марафон в следующей версии') }}</li>
          </ul>
          <button class="primary" @click="showResult = false">{{ t('Дальше') }}</button>
        </template>
        <template v-else>
          <h2>{{ t('Сход на {c} из {k} км', { c: Math.min(Math.floor(lastResult.covered * 100) / 100, lastResult.km - 0.01).toFixed(2), k: lastResult.km }) }}</h2>
          <p class="muted" v-if="lastResult.gaveUp">{{ t(state.character === 'she' ? 'Ты сошла с дистанции на {t}.' : 'Ты сошёл с дистанции на {t}.', { t: fmtClock(lastResult.time) }) }}</p>
          <p class="muted" v-else>{{ t('Тень лимита обогнала тебя на {t}.', { t: fmtClock(lastResult.cutoff) }) }}</p>
          <div class="result-actions">
            <button class="primary" @click="goTrain">{{ t('Прокачаться') }}</button>
            <button class="pill" @click="retry">{{ t('Ещё раз') }}</button>
          </div>
        </template>
      </div>
    </section>

    <!-- Выбор персонажа: при первом запуске и из «Ещё» -->
    <section v-if="!state.character || picking" class="picker" role="dialog" :aria-label="t('Выбор персонажа')">
      <h1 class="picker-title">{{ t('Выбери бегуна') }}</h1>
      <p class="picker-sub">{{ t('Характеристики одинаковые — выбирай, кто нравится. Сменить можно в любой момент в настройках.') }}</p>
      <div class="picker-row">
        <button v-for="c in CHARACTERS" :key="c.id" class="pick" :class="{ on: state.character === c.id }" :style="sheetVars(c.id)" @click="pick(c.id)" :aria-label="t(c.name)">
          <span class="sprite idle" aria-hidden="true"></span>
        </button>
      </div>
      <button v-if="state.character" class="link" @click="picking = false">{{ t('Оставить как есть') }}</button>
    </section>
  </main>
</template>

<style scoped>
/* Раскладка: сцена на весь экран, HUD сверху, панель снизу, окна выезжают снизу */
.app {
  --stadium: var(--stadium-day);
  --route: var(--route-day);
  --sky: #8ed6fa; /* = голубое небо панорамы: выше картинки небо продолжается без шва */
  /* пиксельные кнопки 9-slice (tools/sprites/buttons.py): нейтральная — тёмная днём, светлая ночью */
  --btn-neutral: url('./assets/ui/btn-dark.png');
  --btn-neutral-down: url('./assets/ui/btn-dark-down.png');
  --btn-off: url('./assets/ui/btn-off-light.png');
  --tile: calc(64px * var(--px));
  --nav-h: calc(64px + env(safe-area-inset-bottom, 0px));
  position: relative;
  height: 100%;
  max-width: 480px;
  margin: 0 auto;
  overflow: hidden;
  color: var(--fg);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) .app {
    --stadium: var(--stadium-night);
    --route: var(--route-night);
    --sky: #070a1f;
    --btn-neutral: url('./assets/ui/btn-light.png');
    --btn-neutral-down: url('./assets/ui/btn-light-down.png');
    --btn-off: url('./assets/ui/btn-off-dark.png');
  }
}
:root[data-theme='dark'] .app {
  --stadium: var(--stadium-night);
  --route: var(--route-night);
  --sky: #070a1f;
  --btn-neutral: url('./assets/ui/btn-light.png');
  --btn-neutral-down: url('./assets/ui/btn-light-down.png');
  --btn-off: url('./assets/ui/btn-off-dark.png');
}

/* --- сцена --- */
.stage {
  position: absolute;
  inset: 0;
  background: var(--sky);
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  cursor: pointer;
}
/* Фон прокручивается из JS (scrollGround): background-position на целые пиксели */
.ground {
  position: absolute;
  left: 0;
  right: 0;
  bottom: var(--nav-h);
  /* стадион 512×384 (зеркально склеен, без шва), дорожка — нижние 66 строк */
  height: calc(384px * var(--px));
  background: var(--route) 0 0 / calc(800px * var(--px)) 100% repeat-x;
  image-rendering: pixelated;
  pointer-events: none;
}

/* Пиксельные спрайты: лист кадров в ряд; внутренний слой шириной N кадров сдвигается steps(N) */
.sprite {
  display: block;
  position: relative;
  overflow: hidden;
  width: var(--tile);
  height: var(--tile);
  pointer-events: none;
}
.sprite::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: 0 0 / 100% 100% no-repeat;
  image-rendering: pixelated;
  will-change: transform;
}
.sprite.run::before,
.sprite.finish::before {
  width: 800%;
  animation: sheet 0.7s steps(8) infinite;
}
.sprite.run::before {
  background-image: var(--run-sheet);
}
.sprite.finish::before {
  background-image: var(--finish-sheet);
  animation-duration: 0.8s;
}
.sprite.idle::before {
  width: 400%;
  background-image: var(--idle-sheet);
  animation: sheet 1.2s steps(4) infinite;
}
@keyframes sheet {
  to {
    transform: translateX(-100%);
  }
}
.hero {
  position: absolute;
  left: 50%;
  /* ноги на середине дорожки: дорожка 318–384 строки фона, под кроссовками в кадре ~5px пустоты */
  bottom: calc(var(--nav-h) + 27px * var(--px));
  transform: translateX(-50%);
}
/* Тень лимита: тёмный полупрозрачный силуэт за/перед бегуном */
.hero.ghost {
  transform: translateX(calc(-50% + var(--gx, 0px)));
  filter: brightness(0);
  opacity: 0.32;
  transition: transform 0.3s linear;
}
.quit-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  pointer-events: auto;
}
.quit {
  border: 0;
  background: none;
  padding: 2px 0;
  font-size: 13px;
  color: var(--muted);
  text-decoration: underline;
}
.quit.danger {
  color: var(--accent);
  font-weight: 600;
}
.finish-arch {
  position: absolute;
  left: 50%;
  bottom: calc(var(--nav-h) + 25px * var(--px));
  width: calc(84px * var(--px));
  transform: translateX(calc(-50% + var(--ax, 0px)));
  image-rendering: pixelated;
  pointer-events: none;
}
.timer {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.ico-inline {
  width: 16px;
  height: 16px;
  image-rendering: pixelated;
}
.ghost-tag {
  position: absolute;
  left: 50%;
  bottom: calc(var(--nav-h) + 27px * var(--px) + var(--tile) + 4px);
  transform: translateX(calc(-50% + var(--gx, 0px)));
  transition: transform 0.3s linear;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  background: color-mix(in srgb, var(--surface) 70%, transparent);
  color: var(--muted);
  pointer-events: none;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) .hero.ghost,
  :root:not([data-theme='light']) .mini-ghost {
    filter: brightness(0) invert(1);
    opacity: 0.28;
  }
}
:root[data-theme='dark'] .hero.ghost,
:root[data-theme='dark'] .mini-ghost {
  filter: brightness(0) invert(1);
  opacity: 0.28;
}

.pop {
  position: absolute;
  transform: translate(-50%, -100%);
  font-family: var(--num);
  font-synthesis: none;
  font-weight: 700;
  font-size: 16px;
  color: var(--accent);
  text-shadow: 0 1px 0 var(--bg), 0 0 6px var(--bg);
  pointer-events: none;
  animation: pop-up 0.8s ease-out forwards;
  white-space: nowrap;
}
@keyframes pop-up {
  to {
    transform: translate(-50%, -220%);
    opacity: 0;
  }
}
.gel {
  position: absolute;
  left: 0;
  width: calc(32px * var(--px));
  height: calc(32px * var(--px));
  padding: 0;
  border: 0;
  background: transparent center / contain no-repeat;
  image-rendering: pixelated;
  z-index: 1;
  animation: gel-fly linear forwards;
  filter: drop-shadow(0 0 6px rgb(255 200 80 / 0.8));
}
@keyframes gel-fly {
  0% {
    transform: translate(-100%, 0) rotate(-12deg);
  }
  25% {
    transform: translate(calc(min(480px, 100vw) * 0.25), -18px) rotate(10deg);
  }
  50% {
    transform: translate(calc(min(480px, 100vw) * 0.5), 0) rotate(-10deg);
  }
  75% {
    transform: translate(calc(min(480px, 100vw) * 0.75), -18px) rotate(10deg);
  }
  100% {
    transform: translate(calc(min(480px, 100vw) + 10px), 0) rotate(-12deg);
  }
}
.hint-tap {
  position: absolute;
  left: 50%;
  bottom: calc(var(--nav-h) + 27px * var(--px) + var(--tile) + 24px);
  transform: translateX(-50%);
  margin: 0;
  padding: 6px 14px;
  border-radius: 999px;
  /* одна плашка для обеих тем: тёмная полупрозрачная поверх сцены, светлый текст */
  background: rgba(8, 14, 12, 0.62);
  color: #f3f7f5;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  pointer-events: none;
  animation: hint-pulse 1.6s ease-in-out infinite;
}
@keyframes hint-pulse {
  50% {
    opacity: 0.6;
  }
}

/* --- HUD --- */
.hud {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 18px max(16px, env(safe-area-inset-right, 0px)) 0 max(16px, env(safe-area-inset-left, 0px));
  display: grid;
  justify-items: center;
  gap: 2px;
  pointer-events: none;
  text-shadow: 0 1px 0 color-mix(in srgb, var(--sky) 70%, transparent);
}
.hud .label {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 12px;
  font-weight: 600;
}
.muted-line {
  opacity: 0.75;
  font-size: 13px;
}
.next-race {
  pointer-events: auto;
  margin-top: 10px;
  width: 100%;
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  border: 1px solid var(--line);
  text-shadow: none;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  text-align: left;
}
/* Готовность к забегу — штрихованная шкала (это не дистанция) */
.ready {
  display: block;
  position: relative;
  height: 10px;
  border-radius: 5px;
  background: repeating-linear-gradient(135deg, var(--line) 0 6px, transparent 6px 10px);
  border: 1px solid var(--line);
  overflow: hidden;
}
.ready i {
  position: absolute;
  inset: 0 auto 0 0;
  background: repeating-linear-gradient(135deg, var(--accent) 0 6px, color-mix(in srgb, var(--accent) 70%, var(--surface)) 6px 10px);
}
.ready i.maybe {
  background: repeating-linear-gradient(135deg, var(--warn) 0 6px, color-mix(in srgb, var(--warn) 70%, var(--surface)) 6px 10px);
}
/* Запас сил на трассе: метка — сколько нужно до финиша ровным бегом */
.energy {
  position: relative;
  height: 10px;
  border-radius: 5px;
  background: var(--line);
}
.energy i {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 5px;
  background: var(--warn);
  transition: width 0.15s;
}
.energy i.ok {
  background: var(--lane);
}
.energy .need {
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 2px;
  margin-left: -1px;
  background: var(--fg);
}
.maybe {
  color: var(--warn);
}
.ready i.ok {
  background: repeating-linear-gradient(135deg, var(--ok) 0 6px, color-mix(in srgb, var(--ok) 70%, var(--surface)) 6px 10px);
}
/* Пройденная дистанция — сплошная «дорожка» */
.mini.distance {
  height: 12px;
  background: color-mix(in srgb, var(--accent) 22%, var(--line));
}
.result {
  position: absolute;
  inset: 0;
  z-index: 6;
  display: grid;
  grid-template-columns: minmax(0, 1fr); /* карточка не шире экрана, длинный текст переносится */
  place-items: center;
  padding: 24px max(16px, env(safe-area-inset-right, 0px)) 24px max(16px, env(safe-area-inset-left, 0px));
  background: rgb(0 0 0 / 0.35);
}
.result-card {
  width: 100%;
  display: grid;
  gap: 12px;
  justify-items: center;
  text-align: center;
  padding: 20px 16px;
  border-radius: 20px;
  background: var(--bg);
  border: 2px solid var(--line);
  animation: sheet-in 0.2s ease-out;
}
.result-card.dnf {
  text-align: left;
  justify-items: stretch;
}
.result-card .primary {
  width: 100%;
}
.splits.two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: 100%;
}
.rewards {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}
.result-actions .pill {
  border: 8px solid transparent;
  border-bottom-width: 12px;
  border-radius: 0;
  border-image: var(--btn-neutral) 4 4 6 4 fill / 8px 8px 12px 8px stretch;
  image-rendering: pixelated;
  background: none;
  color: var(--bg);
  font-weight: 600;
  padding: 7px 4px;
}
.result-actions .pill:active {
  border-image-source: var(--btn-neutral-down);
}
.result-actions {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 8px;
}
.next-race .mini {
  display: block;
}
.next-race .muted {
  color: var(--muted);
}
.plate {
  margin-top: 6px;
  padding: 2px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface) 70%, transparent);
  text-shadow: none;
  border: 1px solid var(--line);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  pointer-events: none;
}
.km {
  font-family: var(--num);
  font-synthesis: none;
  font-weight: 700;
  font-size: min(44px, calc((100vw - 120px) / 6)); /* 6 знаков помещаются между угловыми кнопками */
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.km small {
  font-size: 0.32em;
  margin-left: 6px;
}
.hud-line {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}
.accent {
  color: var(--accent);
}
.race-hud {
  margin-top: 10px;
  width: 100%;
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  border: 1px solid var(--line);
  text-shadow: none;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.race-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.mini {
  position: relative;
  height: 10px;
  border-radius: 5px;
  background: var(--line);
}
.mini.big {
  height: 12px;
}
.mini-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 5px;
  background: var(--accent);
}
.mini-fill.ok {
  background: var(--ok);
}
.mini-ghost {
  position: absolute;
  top: -6px;
  width: 24px;
  height: 24px;
  transform: translateX(-50%);
  filter: brightness(0);
  opacity: 0.45;
  pointer-events: none;
}
.mini-dot {
  position: absolute;
  top: -3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  transform: translateX(-50%);
  background: var(--fg);
  border: 3px solid var(--surface);
}

/* --- нижняя панель --- */
.tabs {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--nav-h);
  padding: 0 max(8px, env(safe-area-inset-right, 0px)) env(safe-area-inset-bottom, 0px) max(8px, env(safe-area-inset-left, 0px));
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background: var(--surface);
  border-top: 1px solid var(--line);
  z-index: 3;
}
.tab {
  position: relative;
  border: 0;
  background: none;
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 2px;
  font-size: 12px;
  color: var(--muted);
}
.tab.on {
  color: var(--accent);
}
.ico {
  width: 32px;
  height: 32px;
  image-rendering: pixelated;
  display: block;
}
.ico.x2 {
  width: 64px;
  height: 64px;
}
.ico.start {
  filter: grayscale(1);
  opacity: 0.5;
}
.tab:not(.on) .ico {
  filter: saturate(0.6);
  opacity: 0.85;
}
/* идёт забег — маленькая зелёная пульсирующая точка вместо плашки */
.live-dot {
  position: absolute;
  top: 12px;
  left: calc(50% + 12px);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--ok);
  box-shadow: 0 0 0 2px var(--surface);
  animation: live 1.4s ease-in-out infinite;
}
@keyframes live {
  50% {
    transform: scale(0.7);
    opacity: 0.6;
  }
}
.badge {
  position: absolute;
  top: 8px;
  left: calc(50% + 8px);
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--accent);
  color: var(--accent-fg);
  font-style: normal;
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
}

/* --- окна --- */
.backdrop {
  position: absolute;
  inset: 0 0 var(--nav-h);
  background: rgb(0 0 0 / 0.35);
  z-index: 1;
}
.sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: var(--nav-h);
  max-height: calc(100% - var(--nav-h) - 72px);
  display: flex;
  flex-direction: column;
  background: var(--bg);
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -8px 24px rgb(0 0 0 / 0.18);
  z-index: 2;
  animation: sheet-in 0.18s ease-out;
}
@keyframes sheet-in {
  from {
    transform: translateY(24px);
    opacity: 0;
  }
}
.sheet-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px max(16px, env(safe-area-inset-right, 0px)) 10px max(16px, env(safe-area-inset-left, 0px));
  border-bottom: 1px solid var(--line);
}
.seg {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  margin-bottom: 4px;
}
.seg .muted {
  margin-right: auto;
}
.seg-btn {
  min-width: 52px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.seg-btn.on {
  background: var(--fg);
  color: var(--bg);
  border-color: var(--fg);
}
.offline-fx {
  color: var(--lane);
}
.sheet-head h2 {
  flex: 1;
}
.close {
  border: 0;
  background: var(--surface);
  width: 32px;
  height: 32px;
  border-radius: 50%;
}
.sheet-body {
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 12px max(16px, env(safe-area-inset-right, 0px)) 20px max(16px, env(safe-area-inset-left, 0px));
  display: grid;
  gap: 12px;
  align-content: start;
}

/* --- содержимое окон --- */
h2,
h3 {
  margin: 0;
  font-family: var(--display);
  font-weight: 600;
  font-size: 22px;
}
.section {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 15px;
  color: var(--muted);
  margin-top: 8px;
}
.muted,
.meta,
.howto {
  color: var(--muted);
}
.muted,
.lead,
.verdict {
  margin: 0;
}
.small {
  font-size: 13px;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
}
.item {
  display: grid;
  grid-template-columns: 32px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}
.item.locked {
  opacity: 0.55;
}
.medal-sum {
  display: flex;
  align-items: center;
  gap: 12px;
}
.medal-count {
  display: block;
  font-family: var(--num);
  font-synthesis: none;
  font-size: 32px;
  line-height: 1;
}
.medals {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.medals li {
  display: grid;
  justify-items: center;
  gap: 2px;
  padding: 10px 4px;
  border-radius: 12px;
  background: var(--surface);
  border: 1px solid var(--line);
  font-variant-numeric: tabular-nums;
}
.medals li:not(.got) .ico {
  filter: grayscale(1);
  opacity: 0.35;
}
.medals li:not(.got) {
  color: var(--muted);
}
.m-name {
  font-weight: 600;
  font-size: 13px;
  text-align: center;
}
.m-time {
  font-size: 12px;
  color: var(--muted);
}
.info {
  min-width: 0;
}
.name {
  font-weight: 600;
}
.count {
  font-family: var(--display);
  color: var(--accent);
  margin-left: 4px;
  white-space: nowrap;
}
.meta {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.buy {
  /* одна ширина у всех кнопок цены — края в столбик ровные (влезает самая длинная «1.23Qa км») */
  width: 132px;
  flex-shrink: 0;
  white-space: nowrap;
  border: 8px solid transparent;
  border-bottom-width: 12px;
  border-image: var(--btn-neutral) 4 4 6 4 fill / 8px 8px 12px 8px stretch;
  image-rendering: pixelated;
  background: none;
  color: var(--bg);
  padding: 2px 4px;
  font-family: var(--num);
  font-synthesis: none;
  font-weight: 600;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.buy:active:not(:disabled) {
  border-image-source: var(--btn-neutral-down);
}
.buy:disabled {
  border-image-source: var(--btn-off);
  color: var(--muted);
  cursor: default;
}
.buy.wide {
  width: 100%;
}
.boosts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}
.boost {
  min-width: 0;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px;
  display: grid;
  gap: 8px;
  align-content: start;
}
.boost.full {
  grid-column: 1 / -1;
}
.bhead {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 4px 8px;
}
.bname {
  font-family: var(--display);
  font-weight: 600;
  font-size: 18px;
}
.chip {
  font-size: 12px;
  border-radius: 999px;
  padding: 2px 8px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.chip.speed {
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  color: var(--accent);
}
.chip.stamina {
  background: color-mix(in srgb, var(--lane) 16%, transparent);
  color: var(--lane);
}
.chip.click {
  background: color-mix(in srgb, var(--ok) 16%, transparent);
  color: var(--ok);
}
.now {
  display: flex;
  gap: 8px;
  align-items: center;
  font-weight: 600;
  min-height: 28px;
}
.pips {
  display: flex;
  gap: 4px;
}
.meta.owned {
  color: var(--ok);
}
.boost-row .name {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.now-name {
  font-size: 14px;
  margin-top: 2px;
}
.boost-row .pips {
  max-width: 160px;
  margin: 6px 0 4px;
}
.pips i {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: var(--line);
}
.pips i.on {
  background: var(--fg);
}
.next {
  font-size: 13px;
  color: var(--muted);
  min-height: 36px;
}
.next.max {
  min-height: 0;
  color: var(--ok);
}
.race-name {
  font-size: 26px;
}
.splits {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.splits dt {
  font-size: 12px;
  color: var(--muted);
}
.splits dd {
  margin: 0;
  font-family: var(--num);
  font-synthesis: none;
  font-weight: 600;
  font-size: 12px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.late {
  color: var(--accent);
}
.ok {
  color: var(--ok);
}
.verdict {
  font-weight: 600;
}
.howto {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
}
.howto b {
  color: var(--fg);
  font-weight: 600;
}
.why {
  padding: 10px 12px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent) 10%, var(--surface));
  font-size: 14px;
}
.why p {
  margin: 0 0 6px;
}
.why ul {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 4px;
}
.last {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}
.races {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
}
.races li {
  display: grid;
  grid-template-columns: 24px 1fr auto;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--line);
  font-variant-numeric: tabular-nums;
}
.races li.locked {
  color: var(--muted);
}
.races .mark {
  width: 16px;
  height: 16px;
  image-rendering: pixelated;
}
.races li.next {
  font-weight: 600;
}
.rcut {
  color: var(--muted);
  font-size: 13px;
}
.primary {
  /* пиксельная объёмная кнопка: ступенчатые углы, блик сверху, толщина снизу; при нажатии «вдавливается» */
  border: 8px solid transparent;
  border-bottom-width: 12px;
  border-image: url('./assets/ui/btn-accent.png') 4 4 6 4 fill / 8px 8px 12px 8px stretch;
  image-rendering: pixelated;
  padding: 7px;
  background: none;
  color: #fff;
  font-family: var(--body);
  font-weight: 600;
  font-size: 17px;
}
.primary:active:not(:disabled) {
  border-image-source: url('./assets/ui/btn-accent-down.png');
}
/* старт без запаса: такая же кнопка, но нейтральная, как кнопки покупки */
.primary.risky {
  border-image-source: var(--btn-neutral);
  color: var(--bg);
}
.primary.risky:active:not(:disabled) {
  border-image-source: var(--btn-neutral-down);
}
.setting {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
}
.pill {
  border: 1px solid var(--line);
  background: var(--surface);
  border-radius: 999px;
  padding: 6px 12px;
}
.link {
  background: none;
  border: 0;
  padding: 0;
  text-decoration: underline;
  color: var(--muted);
  margin-right: 10px;
}
.link.danger {
  color: var(--accent);
}

.picker {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 16px;
  padding: 24px max(16px, env(safe-area-inset-right, 0px)) 24px max(16px, env(safe-area-inset-left, 0px));
  background: color-mix(in srgb, var(--bg) 92%, transparent);
  text-align: center;
}
.picker-title {
  margin: 0;
  font-family: var(--display);
  font-weight: 700;
  font-size: 34px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.picker-sub {
  margin: 0;
  max-width: 30ch;
  color: var(--muted);
}
.picker-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  width: 100%;
}
.pick {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 20px 8px 28px;
  border: 2px solid var(--line);
  border-radius: 18px;
  background: var(--stadium) center bottom / calc(512px * var(--px)) calc(384px * var(--px)) repeat-x;
  image-rendering: pixelated;
}
.pick.on,
.pick:hover {
  border-color: var(--accent);
}
.pick .sprite {
  width: calc(64px * var(--px));
  height: calc(64px * var(--px));
}
/* Кнопка настроек — шестерёнка в правом верхнем углу */
.gear-btn {
  position: absolute;
  top: max(10px, env(safe-area-inset-top, 0px));
  right: max(10px, env(safe-area-inset-right, 0px));
  width: 44px;
  height: 44px;
  padding: 6px;
  border: 0;
  background: none;
  pointer-events: auto;
}
/* Кнопки звука и музыки — слева вверху, зеркально шестерёнке */
.mute-btn {
  position: absolute;
  top: max(10px, env(safe-area-inset-top, 0px));
  left: max(10px, env(safe-area-inset-left, 0px));
  pointer-events: auto;
}
.corner-btn {
  width: 44px;
  height: 44px;
  padding: 6px;
  border: 0;
  background: none;
}
.corner-btn img {
  width: 32px;
  height: 32px;
  display: block;
  image-rendering: pixelated;
}
/* Тёмный флажок «Забег» в тёмной теме теряется на фоне панели — светлый пиксельный контур */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) .ico.outlined {
    filter: drop-shadow(1px 0 0 #9aa8a2) drop-shadow(-1px 0 0 #9aa8a2) drop-shadow(0 1px 0 #9aa8a2) drop-shadow(0 -1px 0 #9aa8a2);
  }
}
:root[data-theme='dark'] .ico.outlined {
  filter: drop-shadow(1px 0 0 #9aa8a2) drop-shadow(-1px 0 0 #9aa8a2) drop-shadow(0 1px 0 #9aa8a2) drop-shadow(0 -1px 0 #9aa8a2);
}
.gear-btn img {
  width: 32px;
  height: 32px;
  image-rendering: pixelated;
  display: block;
}
/* Настройки: компактный переключатель справа — общая «таблетка» с сегментами */
.toggle {
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  border-radius: 999px;
  background: var(--line);
}
.toggle-btn {
  border: 0;
  background: transparent;
  height: 32px;
  min-width: 44px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-weight: 600;
  font-size: 14px;
  color: var(--muted);
}
.toggle-btn.on {
  background: var(--surface);
  color: var(--fg);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.15);
}
.toggle-btn.char {
  width: 52px;
  padding: 0;
  overflow: hidden;
}
.toggle-btn.char .sprite.tiny {
  flex: none;
}
.sprite.tiny {
  width: 32px;
  height: 32px;
}
.toast {
  position: absolute;
  left: 50%;
  bottom: calc(var(--nav-h) + 12px);
  transform: translateX(-50%);
  width: calc(100% - 32px);
  background: var(--fg);
  color: var(--bg);
  border-radius: 12px;
  padding: 12px 16px;
  font-weight: 500;
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.18);
  z-index: 4;
  pointer-events: none;
}
</style>
