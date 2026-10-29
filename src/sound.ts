// Звук и вибрация: 8-битные эффекты синтезируются Web Audio (без аудиофайлов), вибрация — navigator.vibrate.
// Аудио включается по первому касанию (требование браузеров, особенно Safari на iOS).
import { ref } from 'vue'

const KEY = 'ultramarathon-sound'
function initial(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}
export const soundOn = ref(initial())
export function setSound(on: boolean) {
  soundOn.value = on
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    /* не запомним — не страшно */
  }
  if (on) unlock()
}

// Общий «без звука» (кнопка в углу): глушит эффекты, музыку и вибрацию, не трогая раздельные настройки
const MUTE_KEY = 'ultramarathon-muted'
function mutedInitial(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}
export const muted = ref(mutedInitial())
export function setMuted(m: boolean) {
  muted.value = m
  try {
    localStorage.setItem(MUTE_KEY, m ? '1' : '0')
  } catch {
    /* не запомним */
  }
  if (m) stopMusic()
  else {
    unlock()
    startMusic()
  }
}
const sfxOn = () => soundOn.value && !muted.value

let ctx: AudioContext | null = null
let master: GainNode | null = null

function createContext() {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = 0.35
  master.connect(ctx.destination)
  musicGain = null // узлы старого контекста к новому не подключить
  noiseBuf = null
}

/** Контекст «застрял» (iOS после сворачивания): пересоздаём его на следующем касании — только внутри жеста он оживёт */
let stale = false

function rebuild() {
  const playing = !!timer
  stopMusic()
  void ctx?.close().catch(() => {})
  ctx = null
  createContext()
  if (playing) startMusic()
}

/** iOS: короткий беззвучный звук внутри жеста окончательно «открывает» аудио */
function primeSilence() {
  if (!ctx) return
  const src = ctx.createBufferSource()
  src.buffer = ctx.createBuffer(1, 1, 22050)
  src.connect(ctx.destination)
  src.start(0)
}

/**
 * Создать/разбудить аудио. Вызывается на каждом касании (жест пользователя): браузер мог приостановить звук
 * (suspended), а iOS — прервать (interrupted) после сворачивания игры. Новый контекст создаётся только здесь,
 * внутри жеста: созданный вне жеста на iOS так и останется немым.
 */
export function unlock() {
  try {
    const state = ctx?.state as string | undefined // iOS добавляет своё состояние 'interrupted'
    if (!ctx || stale || state === 'closed' || state === 'interrupted') {
      stale = false
      if (ctx) rebuild()
      else createContext()
    }
    const c = ctx!
    if (c.state === 'running') return
    primeSilence()
    void c.resume().catch(() => (stale = true))
    // не ожил за секунду — на следующем касании пересоздадим
    setTimeout(() => {
      if (c === ctx && c.state !== 'running' && !document.hidden) stale = true
    }, 1000)
  } catch {
    ctx = null
  }
}

type Wave = OscillatorType
/** Одна нота: частота (или глиссандо from→to), длительность, громкость, форма волны, задержка. */
function tone(freq: number, dur: number, { vol = 0.5, wave = 'square' as Wave, to = 0, delay = 0 } = {}) {
  if (!sfxOn() || !ctx || !master) return
  const t0 = ctx.currentTime + delay
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = wave
  osc.frequency.setValueAtTime(freq, t0)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur)
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(vol, t0 + 0.005)
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur)
  osc.connect(g).connect(master)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

let noiseBuf: AudioBuffer | null = null
/** Короткий шум (шаг, удар): фильтруется по высоте. */
function noise(dur: number, { vol = 0.3, freq = 1200, delay = 0 } = {}) {
  if (!sfxOn() || !ctx || !master) return
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const t0 = ctx.currentTime + delay
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  const f = ctx.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = freq
  const g = ctx.createGain()
  g.gain.setValueAtTime(vol, t0)
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur)
  src.connect(f).connect(g).connect(master)
  src.start(t0)
  src.stop(t0 + dur + 0.02)
}

function vibrate(p: number | number[]) {
  if (!sfxOn()) return
  try {
    navigator.vibrate?.(p) // на iPhone вибрация из браузера недоступна — тихо пропускаем
  } catch {
    /* нет вибрации */
  }
}

let lastDash = 0

export const sfx = {
  /** рывок: тихий мягкий щелчок; при частых тапах звучит не чаще раза в 90 мс */
  dash() {
    const now = performance.now()
    if (now - lastDash > 90) {
      lastDash = now
      tone(420 + Math.random() * 60, 0.035, { vol: 0.07, wave: 'triangle', to: 300 })
    }
    vibrate(8)
  },
  /** рывок без сил — глухо */
  noEnergy() {
    tone(140, 0.09, { vol: 0.3, wave: 'triangle', to: 90 })
  },
  /** пойманный гель — звон вверх */
  gel() {
    tone(784, 0.08, { vol: 0.3 })
    tone(1175, 0.08, { vol: 0.3, delay: 0.07 })
    tone(1568, 0.14, { vol: 0.3, delay: 0.14 })
    vibrate(25)
  },
  /** покупка — «монетка» */
  buy() {
    tone(988, 0.06, { vol: 0.3 })
    tone(1319, 0.16, { vol: 0.3, delay: 0.06 })
  },
  /** старт забега: три коротких и один длинный сигнал */
  start() {
    tone(523, 0.12, { vol: 0.3 })
    tone(523, 0.12, { vol: 0.3, delay: 0.25 })
    tone(523, 0.12, { vol: 0.3, delay: 0.5 })
    tone(1047, 0.35, { vol: 0.35, delay: 0.75 })
    vibrate([20, 230, 20, 230, 20, 230, 60])
  },
  /** шаг на трассе — тихо */
  step() {
    noise(0.04, { vol: 0.12, freq: 900 })
  },
  /** «стена» — удар */
  wall() {
    noise(0.25, { vol: 0.5, freq: 300 })
    tone(110, 0.3, { vol: 0.35, wave: 'triangle', to: 55 })
    vibrate(80)
  },
  /** финиш — фанфара */
  finish() {
    const n = [523, 659, 784, 1047]
    n.forEach((f, i) => tone(f, 0.12, { vol: 0.32, delay: i * 0.1 }))
    tone(784, 0.12, { vol: 0.32, delay: 0.45 })
    tone(1047, 0.5, { vol: 0.36, delay: 0.57 })
    vibrate([60, 40, 60, 40, 160])
  },
  /** сход — грустный спуск */
  dnf() {
    tone(392, 0.18, { vol: 0.3, wave: 'triangle' })
    tone(330, 0.18, { vol: 0.3, wave: 'triangle', delay: 0.18 })
    tone(262, 0.45, { vol: 0.3, wave: 'triangle', delay: 0.36, to: 220 })
    vibrate(120)
  },
}

// --- фоновая музыка: 8-битный луп (C–Am–F–G), планировщик с упреждением ---
const MKEY = 'ultramarathon-music'
function musicInitial(): boolean {
  try {
    return localStorage.getItem(MKEY) !== 'off'
  } catch {
    return true
  }
}
export const musicOn = ref(musicInitial())
export function setMusic(on: boolean) {
  musicOn.value = on
  try {
    localStorage.setItem(MKEY, on ? 'on' : 'off')
  } catch {
    /* не запомним */
  }
  if (on) {
    unlock()
    startMusic()
  } else stopMusic()
}

const BPM = 110
const EIGHTH = 60 / BPM / 2
const N: Record<string, number> = {}
'C D E F G A B'.split(' ').forEach((n, i) => {
  const semis = [0, 2, 4, 5, 7, 9, 11][i]
  for (let o = 2; o <= 6; o++) N[n + o] = 440 * 2 ** ((semis + (o - 4) * 12 - 9) / 12)
})
// 4 такта по 8 восьмых: аккорды C, Am, F, G
const BASS = ['C3', 'A2', 'F2', 'G2']
const MELODY = [
  'E5', '-', 'G5', '-', 'C5', 'D5', 'E5', '-',
  'C5', '-', 'E5', '-', 'A4', 'C5', 'E5', '-',
  'F5', '-', 'A5', 'G5', 'F5', '-', 'C5', '-',
  'D5', '-', 'G4', 'B4', 'D5', '-', 'G5', '-',
  'E5', 'G5', 'C6', '-', 'G5', '-', 'E5', '-',
  'A4', 'C5', 'E5', '-', 'C5', '-', 'A4', '-',
  'F4', 'A4', 'C5', 'F5', 'E5', '-', 'C5', '-',
  'D5', '-', 'B4', '-', 'G4', '-', '-', '-',
]
let musicGain: GainNode | null = null
let timer = 0
let step = 0
let nextTime = 0

function note(freq: number, t: number, dur: number, wave: OscillatorType, vol: number) {
  if (!ctx || !musicGain) return
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = wave
  o.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  o.connect(g).connect(musicGain)
  o.start(t)
  o.stop(t + dur + 0.02)
}
function hat(t: number) {
  if (!ctx || !musicGain) return
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  const f = ctx.createBiquadFilter()
  f.type = 'highpass'
  f.frequency.value = 6000
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.06, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
  src.connect(f).connect(g).connect(musicGain)
  src.start(t)
  src.stop(t + 0.06)
}
function schedule() {
  if (!ctx) return
  while (nextTime < ctx.currentTime + 0.25) {
    const i = step % MELODY.length
    const bar = Math.floor(i / 8) % 4
    const root = N[BASS[bar]]
    note(i % 2 === 0 ? root : root * 2, nextTime, EIGHTH * 0.9, 'triangle', 0.22) // бас: корень / октава
    const m = MELODY[i]
    if (m !== '-') note(N[m], nextTime, EIGHTH * 1.6, 'square', 0.045) // мелодия тихо
    if (i % 2 === 1) hat(nextTime) // хай-хэт на слабые доли
    nextTime += EIGHTH
    step++
  }
}
export function startMusic() {
  if (!musicOn.value || muted.value || timer) return
  if (!ctx || !master) return // аудио ещё не разбужено касанием
  if (!musicGain) {
    musicGain = ctx.createGain()
    musicGain.gain.value = 0.5
    musicGain.connect(master)
  }
  nextTime = ctx.currentTime + 0.1
  timer = window.setInterval(schedule, 60)
}
export function stopMusic() {
  clearInterval(timer)
  timer = 0
}
// свернули вкладку — тишина, вернулись — продолжаем
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopMusic()
  else {
    void ctx?.resume().catch(() => {}) // на десктопе оживает сразу; на iOS — по следующему касанию (unlock)
    startMusic()
  }
})
