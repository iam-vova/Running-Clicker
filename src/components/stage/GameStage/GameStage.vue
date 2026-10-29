<script setup lang="ts">
// Сцена на весь экран: прокрутка трассы, бегун, тень лимита, финишная арка, гели и всплывающие «+км».
// Тап в любое место (или пробел) — рывок.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { catchGel, catchRaceGel, click, clickValue, feedDue, fmt, fmtClock, forecast, raceSpeed } from '../../../game/logic.ts'
import { paused, state } from '../../../game/state.ts'
import { t } from '../../../i18n.ts'
import { sfx } from '../../../sound.ts'
import { useRace } from '../../../composables/useRace.ts'
import { useRaceFlow } from '../../../composables/useRaceFlow.ts'
import { useScale } from '../../../composables/useScale.ts'
import { useSheets } from '../../../composables/useSheets.ts'
import gelImg from '../../../assets/sprites/items/gel.png'
import archImg from '../../../assets/sprites/items/finish-arch.png'

const { px } = useScale()
const { activeRace, live, timeLeft } = useRace()
const { runout, celebrating } = useRaceFlow()
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
  if (dashing.value || runout.value || state.activeRace) moveGround(GROUND_SPEED * dt)
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
  frame = requestAnimationFrame(loop)
}

// --- финишная арка стоит на земле: едет вместе с фоном и встречает бегуна ровно на финише ---
const archEl = ref<HTMLElement | null>(null)
const archOn = ref(false)
let archWorld = 0 // положение арки в координатах groundTotal
function placeArch() {
  if (state.activeRace && live.value) {
    const target = groundTotal + groundBoost + timeLeft() * GROUND_SPEED // groundBoost: рывок уже засчитан, земля его догоняет
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

// --- тень лимита: стоит на трассе там же, где была бы, — в том же масштабе, что и земля.
// Оторвался далеко — тень уходит за левый край экрана; отстал — убегает за правый ---
const ghostX = computed(() => {
  if (!live.value || !activeRace.value) return 0
  const secs = live.value.leadM / 1000 / raceSpeed(state, activeRace.value.id) // на сколько секунд бега отрыв
  return Math.max(-900, Math.min(900, -secs * GROUND_SPEED * px.value))
})

// --- бегун ---
const dashing = ref(false)
const heroPose = computed(() => (celebrating.value ? 'finish' : dashing.value || runout.value || state.activeRace ? 'run' : 'idle'))

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
  const text = inRace ? (inRace.canTap ? t('+{n} м', { n: Math.round(inRace.tapM) }) : t('нет сил')) : t('+{n} км', { n: fmt(clickValue(state)) })
  // рывок на трассе — бегун продвинулся: сдвигаем землю на столько же, чтобы арка и фон двигались вместе
  if (inRace && inRace.canTap) groundBoost += (inRace.tapM / 1000 / inRace.speed) * GROUND_SPEED
  if (inRace && !inRace.canTap) sfx.noEnergy()
  else sfx.dash()
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
  const text = gel.value?.race ? t('+{n}% сил', { n: Math.round(catchRaceGel(state) * 100) }) : t('+{n} км', { n: fmt(catchGel(state)) })
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
    <!-- Финишная арка: появляется у правого края, бегун пробегает под ней и празднует рядом -->
    <img v-show="archOn" ref="archEl" class="game-stage__arch" :src="archImg" alt="" />
    <!-- Тень лимита: силуэт бегуна в темп контрольного времени — позади, если успеваешь, впереди, если отстаёшь -->
    <template v-if="live && activeRace">
      <span class="sprite sprite--run game-stage__hero game-stage__hero--ghost" :style="{ '--gx': ghostX + 'px' }" aria-hidden="true"></span>
      <span class="game-stage__ghost-tag" :style="{ '--gx': ghostX + 'px' }">{{ t('лимит {t}', { t: fmtClock(activeRace.cutoff) }) }}</span>
    </template>
    <span ref="heroEl" class="sprite game-stage__hero" :class="`sprite--${heroPose}`" aria-hidden="true"></span>
    <button
      v-if="gel"
      :key="gel.id"
      class="game-stage__gel"
      :style="{ top: gel.top * 100 + '%', animationDuration: gel.dur + 's', backgroundImage: `url(${gelImg})` }"
      :aria-label="t('Поймать гель')"
      @pointerdown.stop="grabGel"
      @animationend="gel = null"
    ></button>
    <span v-for="p in pops" :key="p.id" class="game-stage__pop" :style="{ left: p.x + 'px', top: p.y + 'px' }">{{ p.text }}</span>
    <p v-if="state.clicks < 5 && !state.activeRace && !runout && !celebrating" class="game-stage__hint">{{ t('Нажимай на экран, чтобы бежать') }}</p>
  </div>
</template>

<style lang="scss" src="./styles/component.scss"></style>
