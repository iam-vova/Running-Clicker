<script setup lang="ts">
// Сцена на весь экран: прокрутка трассы, бегун, тень лимита, финишная арка, гели и всплывающие «+км».
// Тап в любое место (или пробел) — рывок.
import { computed, onBeforeUnmount, onMounted, onUpdated, ref, watch } from 'vue'
import { catchGel, catchRaceGel, click, clickValue, feedDue, fmt, fmtClock, forecast, raceSpeed } from '../../../game/logic.ts'
import { paused, state } from '../../../game/state.ts'
import { t } from '../../../i18n/index.ts'
import { sfx } from '../../../sound.ts'
import { raceStats } from '../../../analytics.ts'
import { useRace } from '../../../composables/useRace.ts'
import { useRaceFlow } from '../../../composables/useRaceFlow.ts'
import { useScale } from '../../../composables/useScale.ts'
import { useSheets } from '../../../composables/useSheets.ts'
import gelImg from '../../../assets/sprites/items/gel.png'
import archBackImg from '../../../assets/sprites/items/arch-back.png'
import archFrontImg from '../../../assets/sprites/items/arch-front.png'
import FanCrowd from '../FanCrowd/FanCrowd.vue'
import aidImg from '../../../assets/sprites/items/aid-station.png'
import { fieldTimes } from '../../../game/field.ts'

/** Соперники: листы бега 8×64 (tools/sprites/rivals.py) */
const RIVAL_SHEETS = Object.values(import.meta.glob('../../../assets/sprites/rivals/*.png', { eager: true, import: 'default' }) as Record<string, string>)

const { px } = useScale()
const { activeRace, live, timeLeft } = useRace()
const { runout, celebrating, showResult } = useRaceFlow()
const { sheet } = useSheets()

const rand = (a: number, b: number) => a + Math.random() * (b - a)

// --- прокрутка фона из JS: сдвиг на целые игровые пиксели, без анимированного слоя (на iOS он мигал) ---
const GROUND_SPEED = 64 // игровых пикселей в секунду
/** Панорама маршрута: одна цельная картинка (стадион → парк → город), зеркально замкнута (tools/bg/panorama_single.py) */
const ROUTE_W = 800
const groundEl = ref<HTMLElement | null>(null)
let frame = 0
let groundX = 0
let groundTotal = 0 // пройдено фоном без зацикливания, игровые px — для объектов, стоящих на земле
let last = 0
let stepT = 0
/** Сколько земли ещё «доехать» после рывков: сдвиг не скачком, а ускорением */
let groundBoost = 0
function moveGround(d: number) {
  groundX = (groundX + d) % ROUTE_W
  groundTotal += d
  if (groundEl.value) groundEl.value.style.backgroundPositionX = `${-Math.floor(groundX) * px.value}px`
}
function loop(now: number) {
  const dt = last ? Math.min((now - last) / 1000, 0.1) : 0
  last = now
  if (state.activeRace && feedDue(state)) spawnFeed()
  if (dashing.value || runout.value || cooldown.value || state.activeRace) moveGround(GROUND_SPEED * dt)
  if (groundBoost > 0.01) {
    // рывок = короткое ускорение: земля едет втрое быстрее обычного, пока не догонит (один рывок — ~0.07 с)
    const d = Math.min(groundBoost, GROUND_SPEED * 2 * dt)
    groundBoost -= d
    moveGround(d)
  }
  // шаги на трассе: два шага на цикл анимации бега (0.7 с)
  if (state.activeRace && !paused.value && !document.hidden) {
    stepT += dt
    if (stepT >= 0.35) {
      stepT -= 0.35
      sfx.step()
    }
  }
  placeArch()
  placeProps()
  moveLeftovers(dt)
  placeRunners()
  frame = requestAnimationFrame(loop)
}

// --- финишная арка стоит на земле: едет вместе с фоном и встречает бегуна ровно на финише ---
const archEl = ref<HTMLElement | null>(null)
const archFrontEl = ref<HTMLElement | null>(null)
const archOn = ref(false)
/** Заминка после финиша: бегун бежит дальше, пока арка не уйдёт за экран */
const cooldown = ref(false)
let archWorld = 0 // положение арки в координатах groundTotal
function placeArch() {
  if (state.activeRace && live.value) {
    const target = groundTotal + groundBoost + timeLeft() * GROUND_SPEED // groundBoost: рывок уже засчитан, земля его догоняет
    // появляется за правым краем вместе с толпой справа (она до +206 px от центра арки)
    if (!archOn.value && target - groundTotal < halfStage() + 220) {
      archOn.value = true
      archWorld = target
    } else if (archOn.value && Math.abs(target - archWorld) > 6) {
      archWorld += (target - archWorld) * 0.15 // плавная подстройка под изменившийся прогноз (стена, гель)
    }
  } else if (runout.value && !archOn.value) {
    // финиш серией рывков: забег засчитан раньше, чем земля доехала до арки, — ставим её туда, где финиш
    archOn.value = true
    archWorld = groundTotal + Math.min(groundBoost, 200)
  } else if (archOn.value && !celebrating.value && !runout.value && !showResult.value) {
    // окно результата закрыли: бегун трусит дальше, арка с толпой уезжает за левый край и только там исчезает
    cooldown.value = true
    if (archWorld - groundTotal < -halfStage() - 220) {
      archOn.value = false
      cooldown.value = false
    }
  }
  if (archOn.value) {
    const ax = `${Math.round(archWorld - groundTotal) * px.value}px`
    archEl.value?.style.setProperty('--ax', ax)
    archFrontEl.value?.style.setProperty('--ax', ax)
  }
}

// --- болельщики и пункты питания: стоят на земле (координаты groundTotal) и уезжают вместе с фоном ---
type Prop = { id: number; kind: 'crowd' | 'aid'; world: number; cheered?: boolean }
const props = ref<Prop[]>([])
let propId = 0
const halfStage = () => (stageEl.value ? stageEl.value.clientWidth / 2 / px.value : 200) // полширины сцены, игровые px
function addProp(kind: Prop['kind'], world: number) {
  props.value.push({ id: ++propId, kind, world })
}
function placeProps() {
  if (!props.value.length || !stageEl.value) return
  const gone = -halfStage() - 260 // толпа у пункта питания тянется на +206 px вправо — убираем, когда вся за краем
  for (const p of props.value) {
    const x = p.world - groundTotal
    const el = stageEl.value.querySelector<HTMLElement>(`[data-prop="${p.id}"]`)
    el?.style.setProperty('--ax', `${Math.round(x) * px.value}px`)
    if (p.kind === 'aid' && !p.cheered && x < 10) {
      p.cheered = true
      sfx.cheer(1.2)
    }
  }
  if (props.value.some((p) => p.world - groundTotal < gone)) props.value = props.value.filter((p) => p.world - groundTotal >= gone)
}
// старт забега: толпа у бегуна, сразу уезжает назад
watch(
  () => state.activeRace?.seed,
  (seed, was) => {
    if (seed === undefined || seed === was || (state.activeRace?.elapsed ?? 0) > 0.5) return
    props.value = []
    leftovers.value = []
    archOn.value = false
    cooldown.value = false
    addProp('crowd', groundTotal - 20)
  },
)

// --- соперники: поле любителей с ровным темпом (game/field.ts). Рисуем не всех, а ~12 «представителей»
// поля, равномерно по времени финиша: иначе в плотной середине толпа закрывает бегуна.
// Кто на экране — решает computed (10 раз в секунду, с запасом за краем); где стоит — loop каждый кадр. ---
const RIVAL_SLOTS = 12
/** Отрыв соперника i от бегуна, игровые px земли (+ — впереди). Рывок уже засчитан в covered, а земля его ещё
 *  догоняет (groundBoost) — прибавляем, чтобы соперники отъезжали назад плавно, вместе с фоном, а не скачком */
function rivalOffset(i: number): number | null {
  const a = state.activeRace
  const r = activeRace.value
  if (!a || !r) return null
  const times = fieldTimes(r.id, a.seed ?? 0)
  const T = times[i]
  // на старте не толпимся в одной точке: каждый стартует чуть позади (до ~130 м) и догоняет свой темп
  // к трети дистанции — только картинка, на место в забеге не влияет
  const k = Math.floor(i / Math.ceil(times.length / RIVAL_SLOTS))
  const lag = (((k * 7) % RIVAL_SLOTS) * 0.012 * Math.max(0, 1 - a.elapsed / (0.3 * T)))
  const c = (r.km * a.elapsed) / T - lag
  return ((c - a.covered) / raceSpeed(state, r.id)) * GROUND_SPEED + groundBoost
}
type RivalView = { i: number; lane: number; style: Record<string, string | number> }
/** Скорость соперника i относительно земли, игровые px/с (бегун на своём темпе = GROUND_SPEED) */
function rivalSpeed(i: number): number {
  const a = state.activeRace
  const r = activeRace.value
  if (!a || !r) return GROUND_SPEED
  return ((r.km / fieldTimes(r.id, a.seed ?? 0)[i]) / raceSpeed(state, r.id)) * GROUND_SPEED
}
// после забега соперники не пропадают: бегут дальше своим темпом по земле, пока не уйдут за край экрана
type Leftover = RivalView & { world: number; speed: number }
const leftovers = ref<Leftover[]>([])
let lastSeen: Leftover[] = [] // кто был на экране в последнем кадре забега и где (world)
watch(
  () => !!state.activeRace,
  (on) => {
    if (!on && lastSeen.length) leftovers.value = lastSeen
    lastSeen = []
  },
  { flush: 'sync' }, // до перерисовки: те же элементы продолжают бег, без мигания
)
function moveLeftovers(dt: number) {
  if (!leftovers.value.length) return
  const lim = halfStage() + 48
  for (const l of leftovers.value) l.world += l.speed * dt
  if (leftovers.value.some((l) => Math.abs(l.world - groundTotal) > lim)) leftovers.value = leftovers.value.filter((l) => Math.abs(l.world - groundTotal) <= lim)
}
/** На экране: во время забега — ближайшие соперники, после — те, кто ещё не убежал за край */
const shownRivals = computed<RivalView[]>(() => (state.activeRace ? rivals.value : leftovers.value))

const rivals = computed(() => {
  const a = state.activeRace
  const r = activeRace.value
  if (!a || !r || !live.value) return []
  const n = fieldTimes(r.id, a.seed ?? 0).length
  const step = Math.ceil(n / RIVAL_SLOTS)
  const lim = halfStage() + 48 // спрайт 64 px целиком за краем
  const list = []
  for (let k = 0; k * step + (step >> 1) < n; k++) {
    const i = k * step + (step >> 1)
    const x = rivalOffset(i)
    if (x === null || Math.abs(x) > lim) continue
    list.push({
      i,
      lane: (k % 2) + 1, // дорожка позади бегуна: 1 или 2
      style: {
        '--lane': (k % 2) + 1,
        '--run-sheet': `url(${RIVAL_SHEETS[k % RIVAL_SHEETS.length]})`,
        '--delay': `${-((k * 0.237) % 0.7).toFixed(3)}s`, // шаг не в ногу
      },
    })
  }
  return list.sort((p, q) => q.lane - p.lane) // дальняя дорожка рисуется первой
})

// --- тень лимита: стоит на трассе там же, где была бы, — в том же масштабе, что и земля.
// Оторвался далеко — тень уходит за левый край экрана; отстал — убегает за правый ---
const ghostEl = ref<HTMLElement | null>(null)
const ghostTagEl = ref<HTMLElement | null>(null)
function ghostOffset(): number {
  if (!live.value || !activeRace.value) return 0
  const secs = live.value.leadM / 1000 / raceSpeed(state, activeRace.value.id) // на сколько секунд бега отрыв
  return Math.max(-900, Math.min(900, -secs * GROUND_SPEED + groundBoost))
}

// новые соперники встают на место до отрисовки, а не в центре экрана
onUpdated(placeRunners)

/** Каждый кадр: тень и соперники — в координатах земли, без CSS-переходов (иначе на рывках дёргаются) */
function placeRunners() {
  if (!stageEl.value) return
  const els = stageEl.value.querySelectorAll<HTMLElement>('[data-rival]')
  if (!state.activeRace) {
    for (const el of els) {
      const l = leftovers.value.find((l) => l.i === Number(el.dataset.rival))
      if (l) el.style.setProperty('--gx', `${Math.round(l.world - groundTotal) * px.value}px`)
    }
    return
  }
  const gx = `${Math.round(ghostOffset()) * px.value}px`
  ghostEl.value?.style.setProperty('--gx', gx)
  ghostTagEl.value?.style.setProperty('--gx', gx)
  lastSeen = []
  for (const el of els) {
    const i = Number(el.dataset.rival)
    const x = rivalOffset(i)
    if (x === null) continue
    el.style.setProperty('--gx', `${Math.round(x) * px.value}px`)
    const view = rivals.value.find((v) => v.i === i)
    if (view) lastSeen.push({ ...view, world: groundTotal + x, speed: rivalSpeed(i) })
  }
}

// --- бегун ---
const dashing = ref(false)
const heroPose = computed(() => (celebrating.value ? 'finish' : dashing.value || runout.value || cooldown.value || state.activeRace ? 'run' : 'idle'))

// --- всплывающие «+км» ---
type Pop = { id: number; x: number; y: number; text: string }
const pops = ref<Pop[]>([])
let popId = 0
function pop(x: number, y: number, text: string) {
  const id = ++popId
  pops.value.push({ id, x, y, text })
  setTimeout(() => (pops.value = pops.value.filter((p) => p.id !== id)), 800)
}

// --- рывок ---
let dashTimer = 0
function dash(e?: PointerEvent) {
  const inRace = live.value
  const text = inRace ? (inRace.canTap ? t('stage.plusMeters', { n: Math.round(inRace.tapM) }) : t('stage.noEnergy')) : t('stage.plusKm', { n: fmt(clickValue(state)) })
  // рывок на трассе — бегун продвинулся: сдвигаем землю на столько же, чтобы арка и фон двигались вместе
  if (inRace && inRace.canTap) groundBoost += (inRace.tapM / 1000 / inRace.speed) * GROUND_SPEED
  if (inRace && !inRace.canTap) sfx.noEnergy()
  else sfx.dash()
  if (inRace) raceStats.taps++
  click(state)
  dashing.value = true
  clearTimeout(dashTimer)
  dashTimer = window.setTimeout(() => (dashing.value = false), 500)
  pop(e ? e.offsetX : 0, e ? e.offsetY : 0, text)
}
function onKey(e: KeyboardEvent) {
  if (e.code === 'Space' && !sheet.value) {
    e.preventDefault()
    dash()
  }
}

// --- гели: вне забега — бонус раз в 50–90 с активной игры; на забеге — пункты питания на 1/3 и 2/3 дистанции ---
type Gel = { id: number; top: number; dur: number; race?: boolean }
const gel = ref<Gel | null>(null)
const stageEl = ref<HTMLElement | null>(null)
const heroEl = ref<HTMLElement | null>(null)
let gelTimer = 0
let gelIn = rand(50, 90)
function gelTick() {
  if (document.hidden || gel.value || state.activeRace) return // только активное время вне забега, один гель за раз
  if (--gelIn > 0) return
  gel.value = { id: Date.now(), top: rand(0.28, 0.5), dur: rand(6, 10) }
  gelIn = rand(50, 90)
}
/** Пункт питания: гель летит быстрее, на длинных забегах — дольше; высота случайная в свободной полосе */
function spawnFeed() {
  addProp('aid', groundTotal + halfStage() + 60) // пункт питания въезжает справа
  const r = activeRace.value
  const dur = r ? Math.min(6, Math.max(2.5, forecast(state, r.km) * 0.3)) : 4
  gel.value = { id: Date.now(), top: rand(...raceGelBand()), dur, race: true }
}
/** Свободная полоса для геля на забеге: от низа HUD до середины бегуна (доли высоты сцены) */
function raceGelBand(): [number, number] {
  const hud = document.querySelector('.game-hud')
  if (!stageEl.value || !heroEl.value || !hud) return [0.5, 0.6]
  const s = stageEl.value.getBoundingClientRect()
  const h = heroEl.value.getBoundingClientRect()
  const lo = (hud.getBoundingClientRect().bottom - s.top + 24) / s.height // +24: гель подпрыгивает на 18 px
  const hi = (h.top + h.height * 0.5 - 32 * px.value - s.top) / s.height
  return hi > lo ? [lo, hi] : [lo, lo]
}
function grabGel(e: PointerEvent) {
  sfx.gel()
  if (gel.value?.race) raceStats.gels++
  const text = gel.value?.race ? t('stage.plusEnergy', { n: Math.round(catchRaceGel(state) * 100) }) : t('stage.plusKm', { n: fmt(catchGel(state)) })
  const box = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const stage = stageEl.value!.getBoundingClientRect()
  pop(box.left - stage.left + box.width / 2, box.top - stage.top, text)
  gel.value = null
}

onMounted(() => {
  gelTimer = window.setInterval(gelTick, 1000)
  frame = requestAnimationFrame(loop)
  addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  clearInterval(gelTimer)
  cancelAnimationFrame(frame)
  removeEventListener('keydown', onKey)
})
</script>

<template>
  <div ref="stageEl" class="game-stage" @pointerdown="dash">
    <div ref="groundEl" class="game-stage__ground" aria-hidden="true"></div>
    <!-- Болельщики на старте и пункты питания: стоят на земле и уезжают вместе с фоном -->
    <div v-for="p in props" :key="p.id" :data-prop="p.id" class="game-stage__finish" aria-hidden="true">
      <FanCrowd v-if="p.kind === 'crowd'" class="game-stage__crowd" />
      <template v-else>
        <img class="game-stage__aid" :src="aidImg" alt="" />
        <FanCrowd class="game-stage__crowd game-stage__crowd--right" />
      </template>
    </div>
    <!-- Финишная арка: появляется у правого края; бегуны пробегают внутри — ближняя стойка рисуется поверх них -->
    <Transition name="game-stage-fade">
      <div v-show="archOn" ref="archEl" class="game-stage__finish" aria-hidden="true">
        <FanCrowd class="game-stage__crowd game-stage__crowd--left" />
        <FanCrowd class="game-stage__crowd game-stage__crowd--right" />
        <img class="game-stage__arch" :src="archBackImg" alt="" />
      </div>
    </Transition>
    <!-- Соперники: ближайшие на трассе, на дальних дорожках -->
    <TransitionGroup name="game-stage-fade">
      <span v-for="rv in shownRivals" :key="rv.i" :data-rival="rv.i" class="sprite sprite--run game-stage__rival" :style="rv.style" aria-hidden="true"></span>
    </TransitionGroup>
    <!-- Тень лимита: силуэт бегуна в темп контрольного времени — позади, если успеваешь, впереди, если отстаёшь -->
    <template v-if="live && activeRace">
      <span ref="ghostEl" class="sprite sprite--run game-stage__hero game-stage__hero--ghost" aria-hidden="true"></span>
      <span ref="ghostTagEl" class="game-stage__ghost-tag">{{ t('race.cutoffShort', { t: fmtClock(activeRace.cutoff) }) }}</span>
    </template>
    <span ref="heroEl" class="sprite game-stage__hero" :class="`sprite--${heroPose}`" aria-hidden="true"></span>
    <Transition name="game-stage-fade">
      <div v-show="archOn" ref="archFrontEl" class="game-stage__finish" aria-hidden="true">
        <img class="game-stage__arch" :src="archFrontImg" alt="" />
      </div>
    </Transition>
    <button
      v-if="gel"
      :key="gel.id"
      class="game-stage__gel"
      :style="{ top: gel.top * 100 + '%', animationDuration: gel.dur + 's', backgroundImage: `url(${gelImg})` }"
      :aria-label="t('stage.catchGel')"
      @pointerdown.stop="grabGel"
      @animationend="gel = null"
    ></button>
    <span v-for="p in pops" :key="p.id" class="game-stage__pop" :style="{ left: p.x + 'px', top: p.y + 'px' }">{{ p.text }}</span>
    <p v-if="state.clicks < 5 && !state.activeRace && !runout && !celebrating" class="game-stage__hint">{{ t('stage.hint') }}</p>
  </div>
</template>

<style lang="scss" src="./styles/component.scss"></style>
