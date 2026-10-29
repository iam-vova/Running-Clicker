// Окна, выезжающие снизу: какое открыто. Кнопки внизу экрана (прокачка, забег, профиль) + настройки (шестерёнка).
// «Прокачка» — одно окно с двумя разделами: тренировки (train) и снаряжение (gear).
import { computed, ref } from 'vue'
import { t } from '../i18n/index.ts'

export type Sheet = 'train' | 'gear' | 'race' | 'more' | 'settings'

const sheet = ref<Sheet | null>(null)
/** Последний открытый раздел прокачки — кнопка «Прокачка» открывает его */
const upgradeTab = ref<'train' | 'gear'>('train')
const TITLES = { train: 'tabs.upgrade', gear: 'tabs.upgrade', race: 'tabs.race', more: 'tabs.profile', settings: 'settings.title' } as const
const sheetTitle = computed(() => (sheet.value ? t(TITLES[sheet.value]) : ''))
/** Повторный тап по той же кнопке закрывает окно */
function toggleSheet(id: Sheet) {
  const isUpgrade = id === 'train' || id === 'gear'
  const open = isUpgrade ? sheet.value === 'train' || sheet.value === 'gear' : sheet.value === id
  sheet.value = open ? null : isUpgrade ? upgradeTab.value : id
}
/** Переключить раздел внутри «Прокачки» */
function openUpgrade(tab: 'train' | 'gear') {
  upgradeTab.value = tab
  sheet.value = tab
}
const closeSheet = () => (sheet.value = null)

export const useSheets = () => ({ sheet, sheetTitle, toggleSheet, openUpgrade, closeSheet })
