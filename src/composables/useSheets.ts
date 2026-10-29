// Окна, выезжающие снизу: какое открыто. Вкладки нижней панели + настройки (шестерёнка).
import { computed, ref } from 'vue'
import { t } from '../i18n/index.ts'
import type { MessageKey } from '../i18n/index.ts'

export type Sheet = 'train' | 'gear' | 'race' | 'more' | 'settings'
export const TABS: { id: Sheet; icon: string; label: MessageKey }[] = [
  { id: 'train', icon: 'stopwatch', label: 'tabs.train' },
  { id: 'gear', icon: 'sneaker', label: 'tabs.gear' },
  { id: 'race', icon: 'flag', label: 'tabs.race' },
  { id: 'more', icon: 'medal', label: 'tabs.profile' },
]

const sheet = ref<Sheet | null>(null)
const sheetTitle = computed(() => sheet.value === 'settings' ? t('settings.title') : t(TABS.find((s) => s.id === sheet.value)?.label ?? 'tabs.train'))
/** Повторный тап по той же вкладке закрывает окно */
const toggleSheet = (id: Sheet) => (sheet.value = sheet.value === id ? null : id)
const closeSheet = () => (sheet.value = null)

export const useSheets = () => ({ sheet, sheetTitle, toggleSheet, closeSheet })
