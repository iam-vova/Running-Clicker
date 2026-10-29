// Тема: авто (как у просмотрщика/системы) → день → ночь. Выбор запоминается в этом браузере.
import { ref } from 'vue'

export type ThemePref = 'auto' | 'light' | 'dark'
export const THEMES = [
  { id: 'auto', label: 'theme.auto' },
  { id: 'light', label: 'theme.light' },
  { id: 'dark', label: 'theme.dark' },
] as const

const KEY = 'ultramarathon-theme'
const root = document.documentElement
const hostTheme = root.dataset.theme // тема, которую выставил просмотрщик, если выставил
const themePref = ref<ThemePref>('auto')
try {
  const saved = localStorage.getItem(KEY)
  if (saved === 'light' || saved === 'dark') themePref.value = saved
} catch {
  /* хранилище недоступно — остаётся авто */
}

function apply() {
  const th = themePref.value === 'auto' ? hostTheme : themePref.value
  if (th) root.dataset.theme = th
  else delete root.dataset.theme
}
apply()

function setTheme(v: ThemePref) {
  themePref.value = v
  apply()
  try {
    localStorage.setItem(KEY, v)
  } catch {
    /* не запомним — не страшно */
  }
}

export const useTheme = () => ({ themePref, setTheme })
