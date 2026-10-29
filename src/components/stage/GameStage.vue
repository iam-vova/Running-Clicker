<script setup lang="ts">
// Сцена на весь экран: прокрутка трассы, бегун, тень лимита, финишная арка, гели и всплывающие «+км».
// Тап в любое место (или пробел) — рывок.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { catchGel, catchRaceGel, click, clickValue, feedDue, fmt, fmtClock, forecast } from '../../game/logic.ts'
import { paused, state } from '../../game/state.ts'
import { t } from '../../i18n.ts'
import { sfx } from '../../sound.ts'
import { useRace } from '../../composables/useRace.ts'
import { useRaceFlow } from '../../composables/useRaceFlow.ts'
import { useScale } from '../../composables/useScale.ts'
import { useSheets } from '../../composables/useSheets.ts'
import gelImg from '../../assets/sprites/items/gel.png'
import archImg from '../../assets/sprites/items/finish-arch.png'

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
  if (inRace && inRace.canTap) moveGround((inRace.tapM / 1000 / inRace.speed) * GROUND_SPEED)
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
  const hud = document.querySelector('.hud')
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
  <div ref="stageEl" class="stage" @pointerdown="dash">
    <div ref="groundEl" class="ground" aria-hidden="true"></div>
    <!-- Финишная арка: появляется у правого края, бегун пробегает под ней и празднует рядом -->
    <img v-show="archOn" ref="archEl" class="finish-arch" :src="archImg" alt="" />
    <!-- Тень лимита: силуэт бегуна в темп контрольного времени — позади, если успеваешь, впереди, если отстаёшь -->
    <template v-if="live && activeRace">
      <span class="sprite run hero ghost" :style="{ '--gx': live.ghostX + 'px' }" aria-hidden="true"></span>
      <span class="ghost-tag" :style="{ '--gx': live.ghostX + 'px' }">{{ t('лимит {t}', { t: fmtClock(activeRace.cutoff) }) }}</span>
    </template>
    <span ref="heroEl" class="sprite hero" :class="heroPose" aria-hidden="true"></span>
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
</template>

<style scoped>
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
/* Фон прокручивается из JS (loop): background-position на целые пиксели */
.ground {
  position: absolute;
  left: 0;
  right: 0;
  bottom: var(--nav-h);
  height: calc(384px * var(--px)); /* панорама 800×384, дорожка — нижние 66 строк */
  background: var(--route) 0 0 / calc(800px * var(--px)) 100% repeat-x;
  image-rendering: pixelated;
  pointer-events: none;
}
.hero {
  position: absolute;
  left: 50%;
  /* ноги на середине дорожки: дорожка 318–384 строки фона, под кроссовками в кадре ~5px пустоты */
  bottom: calc(var(--nav-h) + 27px * var(--px));
  transform: translateX(-50%);
}
/* Тень лимита: тёмный полупрозрачный силуэт за/перед бегуном (ночью — светлый) */
.hero.ghost {
  transform: translateX(calc(-50% + var(--gx, 0px)));
  filter: brightness(0);
  opacity: 0.32;
  transition: transform 0.3s linear;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) .hero.ghost {
    filter: brightness(0) invert(1);
    opacity: 0.28;
  }
}
:root[data-theme='dark'] .hero.ghost {
  filter: brightness(0) invert(1);
  opacity: 0.28;
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
.finish-arch {
  position: absolute;
  left: 50%;
  bottom: calc(var(--nav-h) + 25px * var(--px));
  width: calc(84px * var(--px));
  transform: translateX(calc(-50% + var(--ax, 0px)));
  image-rendering: pixelated;
  pointer-events: none;
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
/* Подсказка новичку: одна плашка для обеих тем — тёмная полупрозрачная, светлый текст */
.hint-tap {
  position: absolute;
  left: 50%;
  bottom: calc(var(--nav-h) + 27px * var(--px) + var(--tile) + 24px);
  transform: translateX(-50%);
  margin: 0;
  padding: 6px 14px;
  border-radius: 999px;
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
</style>
