// Картинки игры: пиксельные иконки по имени и листы кадров персонажа со слоями снаряжения.
import type { CharId } from '../game/config.ts'
import { state } from '../game/state.ts'
import heRun from '../assets/sprites/he/run.png'
import heIdle from '../assets/sprites/he/idle.png'
import heFinish from '../assets/sprites/he/finish.png'
import sheRun from '../assets/sprites/she/run.png'
import sheIdle from '../assets/sprites/she/idle.png'
import sheFinish from '../assets/sprites/she/finish.png'
import routeDay from '../assets/bg/route.png'
import routeNight from '../assets/bg/route-night.png'
import stadiumDay from '../assets/bg/stadium.png'
import stadiumNight from '../assets/bg/stadium-night.png'

// Пиксельные иконки 32×32 (PixelLab): id = имя файла в assets/icons
const ICONS = import.meta.glob('../assets/icons/*.png', { eager: true, import: 'default' }) as Record<string, string>
export const icon = (id: string) => ICONS[`../assets/icons/${id}.png`]

// --- персонаж: листы кадров 64×64 в ряд ---
type Anim = 'run' | 'idle' | 'finish'
const SHEETS: Record<CharId, Record<Anim, string>> = {
  he: { run: heRun, idle: heIdle, finish: heFinish },
  she: { run: sheRun, idle: sheIdle, finish: sheFinish },
}
// Снаряжение на персонаже: прозрачные слои поверх листа кадров (tools/sprites/gear_layers.py) —
// кроссовки (уровни 1–4) и экипировка (1 шорты, 2 + пояс, 3 + жилет). Слои — фоны того же элемента, анимируются вместе.
const GEAR_LAYERS = import.meta.glob('../assets/sprites/*/*-*.png', { eager: true, import: 'default' }) as Record<string, string>
function layered(id: CharId, anim: Anim): string {
  const { shoes, gear: kit } = state.boosts
  const urls = [
    shoes ? GEAR_LAYERS[`../assets/sprites/${id}/${anim}-shoes-${shoes}.png`] : '',
    kit ? GEAR_LAYERS[`../assets/sprites/${id}/${anim}-kit-${kit}.png`] : '',
    SHEETS[id][anim],
  ]
  return urls.filter(Boolean).map((u) => `url(${u})`).join(', ')
}
/** CSS-переменные для .sprite: листы бега, покоя и победы выбранного персонажа в текущем снаряжении */
export const sheetVars = (id: CharId) => ({
  '--run-sheet': layered(id, 'run'),
  '--idle-sheet': layered(id, 'idle'),
  '--finish-sheet': layered(id, 'finish'),
})

/** Фоны сцены (панорама трассы, стадион на экране выбора) — день и ночь; какой показать, решает тема в CSS */
export const bgVars = {
  '--route-day': `url(${routeDay})`,
  '--route-night': `url(${routeNight})`,
  '--stadium-day': `url(${stadiumDay})`,
  '--stadium-night': `url(${stadiumNight})`,
}
