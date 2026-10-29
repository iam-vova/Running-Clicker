// Окна, выезжающие снизу: какое открыто. Вкладки нижней панели + настройки (шестерёнка).
import { computed, ref } from 'vue'
import { t } from '../i18n.ts'

export type Sheet = 'train' | 'gear' | 'race' | 'more' | 'settings'
export const TABS: { id: Sheet; icon: string; label: string }[] = [
  { id: 'train', icon: 'stopwatch', label: 'Тренировки' },
  { id: 'gear', icon: 'sneaker', label: 'Снаряжение' },
  { id: 'race', icon: 'flag', label: 'Забег' },
  { id: 'more', icon: 'medal', label: 'Профиль' },
]

const sheet = ref<Sheet | null>(null)
const sheetTitle = computed(() => t(sheet.value === 'settings' ? 'Настройки' : (TABS.find((s) => s.id === sheet.value)?.label ?? '')))
/** Повторный тап по той же вкладке закрывает окно */
const toggleSheet = (id: Sheet) => (sheet.value = sheet.value === id ? null : id)
const closeSheet = () => (sheet.value = null)

export const useSheets = () => ({ sheet, sheetTitle, toggleSheet, closeSheet })
